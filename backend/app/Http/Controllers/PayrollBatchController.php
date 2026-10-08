<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\PayrollBatch;
use App\Models\SeniorCitizen;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * ATM payouts. The portal has no connection to the bank, so OSCA records each step from the
 * bank's own documents: the payroll list sent, then the crediting report that comes back.
 * Whether the senior actually received the money is still confirmed by their BSCA President.
 */
class PayrollBatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeHead($request);

        $batches = PayrollBatch::with(['benefit:id,benefit_name', 'creator:id,name,role'])
            ->withCount([
                'transactions',
                'transactions as credited_count' => fn ($query) => $query->where('bank_status', 'credited'),
                'transactions as failed_count' => fn ($query) => $query->where('bank_status', 'crediting_failed'),
                'transactions as received_count' => fn ($query) => $query->where('status', 'released'),
            ])
            ->withSum('transactions as total_amount', 'amount')
            ->latest()
            ->get();

        return response()->json($batches);
    }

    public function show(Request $request, PayrollBatch $payrollBatch): JsonResponse
    {
        $this->authorizeHead($request);

        return response()->json($payrollBatch->load($this->relations()));
    }

    /** Builds the payroll from active seniors on the benefit who have an ATM account on file. */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeHead($request);
        $data = $request->validate([
            'benefit_id' => ['required', 'integer', 'exists:benefits,id'],
            'period_label' => ['required', 'string', 'max:100'],
        ]);
        $benefit = Benefit::findOrFail($data['benefit_id']);
        // Every senior is paid the benefit program's set amount.
        $amount = $benefit->amount ?? 0;

        $seniors = SeniorCitizen::query()
            ->where('status', 'active')
            ->whereNotNull('atm_account_last4')
            ->where('benefit_id', $benefit->id)
            // Seniors already paid or listed for this period, by ATM or cash, are left out.
            ->whereDoesntHave('benefits', fn ($query) => $query
                ->where('benefits.id', $benefit->id)
                ->where('benefit_transactions.period_label', $data['period_label']))
            ->get(['id']);
        abort_if($seniors->isEmpty(), 422, 'No active seniors on this benefit have an ATM account on file and are still unpaid for this period.');

        $batch = DB::transaction(function () use ($request, $data, $benefit, $amount, $seniors) {
            $year = now()->year;
            $sequence = PayrollBatch::where('batch_number', 'like', "PB-{$year}-%")->count() + 1;
            $batch = PayrollBatch::create([
                'batch_number' => sprintf('PB-%d-%04d', $year, $sequence),
                'benefit_id' => $benefit->id,
                'period_label' => $data['period_label'],
                'status' => 'draft',
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);
            foreach ($seniors as $senior) {
                BenefitTransaction::create([
                    'senior_citizen_id' => $senior->id,
                    'benefit_id' => $benefit->id,
                    'distributed_by' => $request->user()->id,
                    'created_by' => $request->user()->id,
                    'updated_by' => $request->user()->id,
                    'amount' => $amount,
                    'period_label' => $data['period_label'],
                    'status' => 'pending',
                    'payout_method' => 'atm',
                    'payroll_batch_id' => $batch->id,
                    'bank_status' => 'for_payroll',
                ]);
            }

            return $batch;
        });
        AuditLog::record($request->user(), 'created', $batch, afterValue: [
            'batch_number' => $batch->batch_number,
            'benefit_id' => $batch->benefit_id,
            'period_label' => $batch->period_label,
            'seniors' => $seniors->count(),
        ]);

        return response()->json($batch->load($this->relations()), 201);
    }

    /** A draft made by mistake can be thrown away before it goes to the bank. */
    public function destroy(Request $request, PayrollBatch $payrollBatch): JsonResponse
    {
        $this->authorizeHead($request);
        abort_unless($payrollBatch->status === 'draft', 422, 'Only a payroll that has not been sent to the bank can be deleted.');

        DB::transaction(function () use ($payrollBatch) {
            $payrollBatch->transactions()->where('bank_status', 'for_payroll')->delete();
            $payrollBatch->delete();
        });
        AuditLog::record($request->user(), 'deleted', $payrollBatch, ['batch_number' => $payrollBatch->batch_number]);

        return response()->json(status: 204);
    }

    public function markSent(Request $request, PayrollBatch $payrollBatch): JsonResponse
    {
        $this->authorizeHead($request);
        abort_unless($payrollBatch->status === 'draft', 422, 'This payroll was already sent to the bank.');
        $data = $request->validate([
            'sent_at' => ['required', 'date', 'before_or_equal:today'],
            'bank_reference' => ['required', 'string', 'max:100'],
        ]);

        DB::transaction(function () use ($request, $payrollBatch, $data) {
            $payrollBatch->update([...$data, 'status' => 'sent_to_bank', 'updated_by' => $request->user()->id]);
            $payrollBatch->transactions()->where('bank_status', 'for_payroll')->update([
                'bank_status' => 'sent_to_bank',
                'reference_number' => $data['bank_reference'],
                'updated_by' => $request->user()->id,
            ]);
        });
        AuditLog::record($request->user(), 'sent_to_bank', $payrollBatch, ['status' => 'draft'], [
            'status' => 'sent_to_bank',
            'bank_reference' => $data['bank_reference'],
        ]);

        return response()->json($payrollBatch->fresh()->load($this->relations()));
    }

    /**
     * Records the bank's crediting report. Rows are matched to the payroll by OSCA ID; rows that
     * do not match are sent back so OSCA can check them by hand.
     */
    public function recordCrediting(Request $request, PayrollBatch $payrollBatch): JsonResponse
    {
        $this->authorizeHead($request);
        abort_if($payrollBatch->status === 'draft', 422, 'Mark the payroll as sent to the bank before recording the crediting report.');
        $data = $request->validate([
            'results' => ['required', 'array', 'min:1', 'max:5000'],
            'results.*.osca_id_number' => ['required', 'string', 'max:50'],
            'results.*.credited' => ['required', 'boolean'],
            'results.*.reason' => ['nullable', 'string', 'max:255'],
            'report' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,csv,xls,xlsx', 'max:10240'],
        ]);

        $transactions = $payrollBatch->transactions()->with('senior:id,osca_id_number')->get()
            ->keyBy(fn (BenefitTransaction $transaction) => $transaction->senior?->osca_id_number);
        $unmatched = [];
        $applied = ['credited' => 0, 'failed' => 0];

        DB::transaction(function () use ($request, $data, $transactions, &$unmatched, &$applied) {
            foreach ($data['results'] as $index => $row) {
                $oscaId = trim($row['osca_id_number']);
                $transaction = $transactions->get($oscaId);
                if (! $transaction) {
                    $unmatched[] = ['row' => $index + 2, 'osca_id_number' => $oscaId, 'message' => 'Not in this payroll.'];

                    continue;
                }
                if ($transaction->status === 'released') {
                    $unmatched[] = ['row' => $index + 2, 'osca_id_number' => $oscaId, 'message' => 'Already confirmed received; left unchanged.'];

                    continue;
                }
                $this->applyCrediting($request, $transaction, (bool) $row['credited'], $row['reason'] ?? null);
                $applied[$row['credited'] ? 'credited' : 'failed']++;
            }
        });

        if ($request->hasFile('report')) {
            $payrollBatch->crediting_report_path = $request->file('report')->store('payroll-reports', SeniorCitizen::FILE_DISK);
        }
        $this->refreshStatus($request, $payrollBatch);
        AuditLog::record($request->user(), 'recorded_crediting', $payrollBatch, afterValue: [
            'credited' => $applied['credited'],
            'crediting_failed' => $applied['failed'],
            'unmatched' => count($unmatched),
        ]);

        return response()->json([
            'batch' => $payrollBatch->fresh()->load($this->relations()),
            'credited' => $applied['credited'],
            'failed' => $applied['failed'],
            'unmatched' => $unmatched,
        ]);
    }

    /** Sets one senior's crediting result by hand, for rows the report could not match. */
    public function updateItem(Request $request, PayrollBatch $payrollBatch, BenefitTransaction $benefitTransaction): JsonResponse
    {
        $this->authorizeHead($request);
        abort_unless($benefitTransaction->payroll_batch_id === $payrollBatch->id, 404);
        abort_if($payrollBatch->status === 'draft', 422, 'Mark the payroll as sent to the bank first.');
        abort_if($benefitTransaction->status === 'released', 422, 'This senior already confirmed receiving the benefit.');
        $data = $request->validate([
            'credited' => ['required', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255', 'required_if:credited,false'],
        ]);

        $this->applyCrediting($request, $benefitTransaction, $data['credited'], $data['reason'] ?? null);
        $this->refreshStatus($request, $payrollBatch);
        AuditLog::record($request->user(), 'recorded_crediting', $benefitTransaction, afterValue: [
            'bank_status' => $benefitTransaction->bank_status,
            'bank_remarks' => $benefitTransaction->bank_remarks,
        ]);

        return response()->json($payrollBatch->fresh()->load($this->relations()));
    }

    public function report(Request $request, PayrollBatch $payrollBatch): StreamedResponse
    {
        $this->authorizeHead($request);
        $path = $payrollBatch->crediting_report_path;
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk(SeniorCitizen::FILE_DISK);
        abort_unless($path && $disk->exists($path), 404, 'This file is not available.');

        return $disk->response($path, headers: ['Cache-Control' => 'private, no-store']);
    }

    /**
     * Saves the last 4 digits of each senior's ATM account from the bank's enrollment list,
     * matched by OSCA ID. Only seniors listed here are included in ATM payrolls.
     */
    public function importAccounts(Request $request): JsonResponse
    {
        $this->authorizeHead($request);
        $data = $request->validate([
            'accounts' => ['required', 'array', 'min:1', 'max:5000'],
            'accounts.*.osca_id_number' => ['required', 'string', 'max:50'],
            'accounts.*.account_last4' => ['required', 'digits:4'],
        ], [
            'accounts.*.account_last4.digits' => 'Row :position: the account number must end in 4 digits.',
        ]);

        $updated = 0;
        $unmatched = [];
        foreach ($data['accounts'] as $index => $row) {
            $senior = SeniorCitizen::where('osca_id_number', trim($row['osca_id_number']))->first();
            if (! $senior) {
                $unmatched[] = ['row' => $index + 2, 'osca_id_number' => $row['osca_id_number'], 'message' => 'No senior has this OSCA ID.'];

                continue;
            }
            if ($senior->atm_account_last4 !== $row['account_last4']) {
                $before = $senior->atm_account_last4;
                $senior->update(['atm_account_last4' => $row['account_last4']]);
                AuditLog::record($request->user(), 'updated', $senior, ['atm_account_last4' => $before], ['atm_account_last4' => $senior->atm_account_last4]);
                $updated++;
            }
        }

        return response()->json(['updated' => $updated, 'unmatched' => $unmatched]);
    }

    private function applyCrediting(Request $request, BenefitTransaction $transaction, bool $credited, ?string $reason): void
    {
        $reason = $reason !== null && trim($reason) !== '' ? trim($reason) : null;
        $transaction->update($credited
            ? ['bank_status' => 'credited', 'bank_remarks' => null, 'status' => 'pending', 'updated_by' => $request->user()->id]
            // The money never reached the account, so the senior did not receive it this period.
            : [
                'bank_status' => 'crediting_failed',
                'bank_remarks' => $reason ?? 'Not credited by the bank.',
                'status' => 'failed',
                'remarks' => $reason ?? 'Not credited by the bank.',
                'updated_by' => $request->user()->id,
            ]);
    }

    /** A payroll is reconciled once the bank has answered for every senior in it. */
    private function refreshStatus(Request $request, PayrollBatch $payrollBatch): void
    {
        $waiting = $payrollBatch->transactions()->where('bank_status', 'sent_to_bank')->exists();
        $payrollBatch->status = $waiting ? 'sent_to_bank' : 'reconciled';
        $payrollBatch->updated_by = $request->user()->id;
        $payrollBatch->save();
    }

    private function relations(): array
    {
        return [
            'benefit:id,benefit_name,amount',
            'creator:id,name,role',
            'updater:id,name,role',
            'transactions' => fn ($query) => $query->orderBy('id'),
            'transactions.senior:id,osca_id_number,first_name,middle_name,last_name,barangay_id,atm_account_last4',
            'transactions.senior.barangay:id,barangay_name',
        ];
    }

    /** ATM payrolls are handled by the OSCA Head, who also schedules benefit releases. */
    private function authorizeHead(Request $request): void
    {
        abort_unless($request->user()->role === 'head', 403, 'Only the Head account can manage ATM payrolls.');
    }
}
