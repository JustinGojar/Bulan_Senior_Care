<?php

namespace App\Http\Controllers;

use App\Models\BenefitTransaction;
use App\Models\AuditLog;
use App\Models\SeniorCitizen;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BenefitTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = max(1, $request->integer('page', 1));
        $perPage = min(1000, max(10, $request->integer('per_page', 25)));
        // The release period, e.g. "October 2026", so each month's records can be seen on their own.
        $period = $request->string('period')->trim()->toString();
        $cacheKey = "benefit-transactions:{$request->user()->id}:{$page}:{$perPage}:".sha1($period);
        $visible = function () use ($request) {
            $query = BenefitTransaction::query()->whereHas('senior')->whereHas('benefit');
            if ($request->user()->role === 'leader') {
                $query->whereHas('senior', fn ($senior) => $senior->where('barangay_id', $request->user()->barangay_id));
            }

            return $query;
        };
        $loadTransactions = function () use ($visible, $period, $page, $perPage) {
            return $visible()
                ->with([
                    'senior.barangay',
                    'senior.encoder:id,name,role',
                    'benefit:id,benefit_name,amount',
                    'distributor:id,name,role',
                    'creator:id,name,role',
                    'updater:id,name,role',
                ])
                ->when($period !== '', fn ($query) => $query->where('period_label', $period))
                ->latest()
                ->paginate($perPage, ['*'], 'page', $page)
                ->toArray();
        };
        $transactions = $perPage >= 500
            ? $loadTransactions()
            : Cache::remember($cacheKey, now()->addSeconds(3), $loadTransactions);

        // Every period this account has records for, newest first, for the period filter.
        $periods = $visible()
            ->whereNotNull('period_label')
            ->groupBy('period_label')
            ->orderByRaw('MAX(id) DESC')
            ->pluck('period_label');

        return response()->json([...$transactions, 'periods' => $periods]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeTransactionEditor($request);
        $data = $request->validate([
            'senior_citizen_id' => ['required', 'integer', 'exists:senior_citizens,id'],
            'benefit_id' => ['required', 'integer', 'exists:benefits,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'period_label' => [
                'required', 'string', 'max:100',
                Rule::unique('benefit_transactions')->where(fn ($query) => $query
                    ->where('senior_citizen_id', $request->integer('senior_citizen_id'))
                    ->where('benefit_id', $request->integer('benefit_id'))),
            ],
            'date_distributed' => ['nullable', 'date', 'required_if:status,released'],
            'status' => ['required', 'in:released,failed,pending'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string', 'max:500'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);
        $senior = \App\Models\SeniorCitizen::findOrFail($data['senior_citizen_id']);
        $this->authorizeScope($request, $senior);
        // A one-time grant is given once per senior, whatever period label it is filed under;
        // only a failed attempt leaves room for another.
        $oneTimeGrantExists = \App\Models\Benefit::whereKey($data['benefit_id'])->where('schedule', 'one_time')->exists()
            && BenefitTransaction::where('senior_citizen_id', $senior->id)
                ->where('benefit_id', $data['benefit_id'])
                ->where('status', '!=', 'failed')
                ->exists();
        abort_if($oneTimeGrantExists, 422, 'This senior already has this one-time grant on record.');
        $data['distributed_by'] = $request->user()->id;
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;
        if ($request->hasFile('attachment')) {
            $data['attachment_path'] = $request->file('attachment')->store('benefit-proofs', SeniorCitizen::FILE_DISK);
        }
        unset($data['attachment']);

        $transaction = BenefitTransaction::create($data);
        $action = $transaction->status === 'released' ? 'released' : 'created';
        AuditLog::record($request->user(), $action, $transaction, afterValue: [
            'benefit_id' => $transaction->benefit_id,
            'status' => $transaction->status,
            'amount' => $transaction->amount,
            'period_label' => $transaction->period_label,
        ]);

        return response()->json($transaction->load($this->relations()), 201);
    }

    public function update(Request $request, BenefitTransaction $benefitTransaction): JsonResponse
    {
        $senior = $benefitTransaction->senior;
        $this->authorizeTransactionEditor($request);
        $this->authorizeScope($request, $senior);
        $beforeValue = $benefitTransaction->only(['benefit_id', 'status', 'amount', 'period_label']);

        $data = $request->validate([
            'status' => ['required', 'in:released,failed,pending'],
            'amount' => ['required', 'numeric', 'min:0'],
            'period_label' => [
                'required', 'string', 'max:100',
                Rule::unique('benefit_transactions')->ignore($benefitTransaction->id)->where(fn ($query) => $query
                    ->where('senior_citizen_id', $benefitTransaction->senior_citizen_id)
                    ->where('benefit_id', $benefitTransaction->benefit_id)),
            ],
            'date_distributed' => ['nullable', 'date', 'required_if:status,released'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string', 'max:500'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);
        if ($request->hasFile('attachment')) {
            $data['attachment_path'] = $request->file('attachment')->store('benefit-proofs', SeniorCitizen::FILE_DISK);
        }
        unset($data['attachment']);
        $benefitTransaction->update([
            ...$data,
            'distributed_by' => $data['status'] === 'released' ? $request->user()->id : $benefitTransaction->distributed_by,
            'updated_by' => $request->user()->id,
        ]);
        $action = $beforeValue['status'] !== 'released' && $benefitTransaction->status === 'released'
            ? 'released'
            : 'updated';
        AuditLog::record($request->user(), $action, $benefitTransaction, $beforeValue, $benefitTransaction->only(['benefit_id', 'status', 'amount', 'period_label']));

        return response()->json($benefitTransaction->fresh()->load($this->relations()));
    }

    public function attachment(Request $request, BenefitTransaction $benefitTransaction): StreamedResponse
    {
        $senior = $benefitTransaction->senior;
        abort_unless($senior, 404, 'This file is not available.');
        $this->authorizeScope($request, $senior);
        $path = $benefitTransaction->attachment_path;
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk(SeniorCitizen::FILE_DISK);
        abort_unless($path && $disk->exists($path), 404, 'This file is not available.');

        // Personal records: never kept by shared caches or on disk by the browser.
        return $disk->response($path, headers: ['Cache-Control' => 'private, no-store']);
    }

    private function relations(): array
    {
        return [
            'senior.barangay',
            'senior.encoder:id,name,role',
            'benefit:id,benefit_name,amount',
            'distributor:id,name,role',
            'creator:id,name,role',
            'updater:id,name,role',
        ];
    }

    private function authorizeStaff(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'head'], true), 403, 'Only Admin and Head accounts can manage benefit releases.');
    }

    private function authorizeTransactionEditor(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'leader'], true), 403, 'Only Admin and Leader accounts can update benefit statuses.');
    }

    private function authorizeScope(Request $request, \App\Models\SeniorCitizen $senior): void
    {
        abort_if($request->user()->role === 'leader' && $request->user()->barangay_id !== $senior->barangay_id, 403, 'This record is outside your barangay.');
    }
}