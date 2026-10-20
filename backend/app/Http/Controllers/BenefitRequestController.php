<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Benefit;
use App\Models\BenefitRequest;
use App\Models\BenefitTransaction;
use App\Models\Notification;
use App\Models\SeniorCitizen;
use App\Models\User;
use App\Support\RolePermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * A leader requests a benefit for an approved senior ("For Verification"). The Head verifies
 * it ("Approved for Release") or rejects it with a reason, then records the release, which
 * files the senior's benefit transaction with the release date and the Head's name.
 */
class BenefitRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(BenefitRequest::STATUSES)],
            'senior' => ['nullable', 'string', 'max:50'],
        ]);
        $user = $request->user();

        $requests = BenefitRequest::query()
            ->whereHas('senior')
            ->with($this->relations())
            ->when($user->role === 'leader', fn ($query) => $query->whereHas('senior', fn ($senior) => $senior->where('barangay_id', $user->barangay_id)))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['senior'] ?? null, fn ($query, $oscaId) => $query->whereHas('senior', fn ($senior) => $senior->where('osca_id_number', $oscaId)))
            ->latest()
            ->latest('id')
            ->paginate(min(100, max(10, $request->integer('per_page', 25))));

        return response()->json($requests);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'leader', 403, 'Benefit requests are submitted by barangay leaders.');
        RolePermissions::authorize($user, 'request benefits');
        $data = $request->validate([
            // The senior's OSCA ID, as the senior pages identify records.
            'senior_id' => ['required', 'string', 'exists:senior_citizens,osca_id_number'],
            'benefit_id' => ['required', 'integer', Rule::exists('benefits', 'id')->where('status', 'active')],
            'remarks' => ['nullable', 'string', 'max:500'],
        ], [
            'benefit_id.required' => 'Select a benefit type.',
            'benefit_id.exists' => 'Select an active benefit type.',
        ]);
        $senior = SeniorCitizen::where('osca_id_number', $data['senior_id'])->firstOrFail();
        abort_if($user->barangay_id !== $senior->barangay_id, 403, 'This record is outside your barangay.');
        $benefit = Benefit::findOrFail($data['benefit_id']);
        $this->abortUnlessEligible($senior, $benefit);
        abort_if(
            BenefitRequest::where('senior_citizen_id', $senior->id)->where('benefit_id', $benefit->id)->whereIn('status', BenefitRequest::OPEN_STATUSES)->exists(),
            422,
            'This senior already has an open request for this benefit.',
        );

        $benefitRequest = BenefitRequest::create([
            'senior_citizen_id' => $senior->id,
            'benefit_id' => $benefit->id,
            'requested_by' => $user->id,
            'status' => 'for_verification',
            'remarks' => $data['remarks'] ?? null,
        ]);
        AuditLog::record($user, 'created', $benefitRequest, afterValue: [
            'senior_citizen_id' => $senior->id,
            'benefit_id' => $benefit->id,
            'status' => 'for_verification',
        ]);
        User::query()->where('role', 'head')->where('status', 'active')->each(fn (User $head) => $this->notify(
            $user,
            $head,
            $benefitRequest,
            "{$user->name} requested {$benefit->benefit_name} for {$this->seniorName($senior)}. It is waiting for verification.",
        ));

        return response()->json($benefitRequest->load($this->relations()), 201);
    }

    public function update(Request $request, BenefitRequest $benefitRequest): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'head', 403, 'Only the Head can verify and release benefit requests.');
        RolePermissions::authorize($user, 'manage benefit requests');
        $senior = $benefitRequest->senior;
        abort_unless($senior, 404, 'This senior record is no longer available.');
        $data = $request->validate([
            'action' => ['required', Rule::in(['verify', 'reject', 'release'])],
            'reason' => ['nullable', 'required_if:action,reject', 'string', 'max:500'],
            'release_date' => ['nullable', 'required_if:action,release', 'date', 'before_or_equal:today'],
            'period_label' => ['nullable', 'string', 'max:100'],
        ], [
            'reason.required_if' => 'Reason is required.',
            'release_date.required_if' => 'Enter the release date.',
            'release_date.before_or_equal' => 'The release date cannot be in the future.',
        ]);
        $before = ['status' => $benefitRequest->status];
        $benefit = $benefitRequest->benefit;

        match ($data['action']) {
            'verify' => $this->verify($user, $benefitRequest, $senior, $benefit),
            'reject' => $this->reject($user, $benefitRequest, trim((string) $data['reason'])),
            'release' => $this->release($user, $benefitRequest, $senior, $benefit, Carbon::parse($data['release_date']), $data['period_label'] ?? null),
        };
        AuditLog::record($user, $data['action'] === 'release' ? 'released' : 'updated', $benefitRequest, $before, $benefitRequest->only(['status', 'period_label', 'rejection_reason']));

        $message = match ($benefitRequest->status) {
            'approved' => "{$benefit->benefit_name} for {$this->seniorName($senior)} was verified and approved for release.",
            'rejected' => "{$benefit->benefit_name} request for {$this->seniorName($senior)} was rejected. Reason: {$benefitRequest->rejection_reason}",
            default => "{$benefit->benefit_name} for {$this->seniorName($senior)} was released on {$benefitRequest->release_date->format('F j, Y')}.",
        };
        if ($benefitRequest->requester && $benefitRequest->requester->status === 'active') {
            $this->notify($user, $benefitRequest->requester, $benefitRequest, $message);
        }

        return response()->json($benefitRequest->fresh()->load($this->relations()));
    }

    private function verify(User $user, BenefitRequest $benefitRequest, SeniorCitizen $senior, Benefit $benefit): void
    {
        abort_unless($benefitRequest->status === 'for_verification', 422, 'Only a request waiting for verification can be verified.');
        $this->abortUnlessEligible($senior, $benefit);
        $benefitRequest->update(['status' => 'approved', 'verified_by' => $user->id, 'verified_at' => now()]);
    }

    private function reject(User $user, BenefitRequest $benefitRequest, string $reason): void
    {
        abort_unless(in_array($benefitRequest->status, BenefitRequest::OPEN_STATUSES, true), 422, 'This request has already been closed.');
        abort_if($reason === '', 422, 'Reason is required.');
        $benefitRequest->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
            'verified_by' => $user->id,
            'verified_at' => now(),
        ]);
    }

    /** Files the senior's released benefit transaction, once per benefit and period. */
    private function release(User $user, BenefitRequest $benefitRequest, SeniorCitizen $senior, Benefit $benefit, Carbon $releaseDate, ?string $periodLabel): void
    {
        abort_unless($benefitRequest->status === 'approved', 422, 'Only a request approved for release can be released.');
        abort_unless($senior->status === 'active', 422, 'Only an active senior can receive a benefit.');
        $periodLabel = filled($periodLabel)
            ? trim($periodLabel)
            : ($benefit->schedule === 'one_time' ? 'One-time' : $releaseDate->format('F Y'));

        $alreadyReleased = BenefitTransaction::where('senior_citizen_id', $senior->id)
            ->where('benefit_id', $benefit->id)
            ->where('status', 'released')
            ->when($benefit->schedule !== 'one_time', fn ($query) => $query->where('period_label', $periodLabel))
            ->exists();
        abort_if($alreadyReleased, 422, $benefit->schedule === 'one_time'
            ? 'Benefit already released: this senior already received this one-time grant.'
            : "Benefit already released to this senior for {$periodLabel}.");

        DB::transaction(function () use ($user, $benefitRequest, $senior, $benefit, $releaseDate, $periodLabel) {
            $values = [
                'status' => 'released',
                'amount' => $benefit->amount ?? 0,
                'date_distributed' => $releaseDate->toDateString(),
                'distributed_by' => $user->id,
                'updated_by' => $user->id,
            ];
            // A record already listed for this period (e.g. by a release batch) is marked received.
            $transaction = BenefitTransaction::where('senior_citizen_id', $senior->id)
                ->where('benefit_id', $benefit->id)
                ->where('period_label', $periodLabel)
                ->first();
            if ($transaction) {
                $transaction->update($values);
            } else {
                $transaction = BenefitTransaction::create([
                    ...$values,
                    'senior_citizen_id' => $senior->id,
                    'benefit_id' => $benefit->id,
                    'period_label' => $periodLabel,
                    'created_by' => $user->id,
                    'remarks' => 'Released from a benefit request.',
                ]);
            }
            $benefitRequest->update([
                'status' => 'released',
                'period_label' => $periodLabel,
                'release_date' => $releaseDate->toDateString(),
                'released_by' => $user->id,
                'benefit_transaction_id' => $transaction->id,
            ]);
        });
    }

    /** Only approved (active) seniors of the benefit's age, and a one-time grant only once. */
    private function abortUnlessEligible(SeniorCitizen $senior, Benefit $benefit): void
    {
        abort_unless($benefit->status === 'active', 422, 'This benefit is no longer active.');
        abort_unless($senior->status === 'active', 422, 'Only an approved senior record can receive a benefit request.');
        $age = $senior->birthdate->age;
        abort_if($age < $benefit->min_age || ($benefit->max_age && $age > $benefit->max_age), 422, "This senior ({$age} years old) is not within the age range for {$benefit->benefit_name}.");
        abort_if(
            $benefit->schedule === 'one_time' && $senior->transactions()->where('benefit_id', $benefit->id)->where('status', 'released')->exists(),
            422,
            'This senior already received this one-time grant.',
        );
    }

    private function notify(User $sender, User $recipient, BenefitRequest $benefitRequest, string $message): void
    {
        Notification::create([
            'sender_account_id' => $sender->id,
            'recipient_account_id' => $recipient->id,
            'message' => $message,
            'source_type' => 'benefit_request',
            'source_id' => $benefitRequest->id,
            'channel' => 'in_app',
            'date_sent' => now(),
            'status' => 'unread',
        ]);
    }

    private function seniorName(SeniorCitizen $senior): string
    {
        return trim("{$senior->first_name} {$senior->last_name}");
    }

    private function relations(): array
    {
        return [
            'senior:id,osca_id_number,first_name,middle_name,last_name,suffix,birthdate,barangay_id,status',
            'senior.barangay:id,barangay_name',
            'benefit:id,benefit_name,amount,schedule',
            'requester:id,name,role',
            'verifier:id,name,role',
            'releaser:id,name,role',
        ];
    }
}
