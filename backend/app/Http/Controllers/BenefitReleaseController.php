<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitRelease;
use App\Models\BenefitTransaction;
use App\Models\Notification;
use App\Models\ReleaseDocument;
use App\Models\SeniorCitizen;
use App\Models\User;
use App\Support\AdvisoryDispatcher;
use App\Support\AgeThresholdNotifier;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BenefitReleaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = max(1, $request->integer('page', 1));
        $perPage = min(50, max(10, $request->integer('per_page', 25)));
        $filters = $request->validate([
            'benefit_id' => ['nullable', 'integer'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
        ]);
        $cacheKey = "benefit-releases:{$request->user()->id}:{$page}:{$perPage}:".sha1(json_encode($filters));
        $releases = Cache::remember($cacheKey, now()->addSeconds(3), function () use ($request, $page, $perPage, $filters) {
            $query = BenefitRelease::with($this->relations())
                ->withCount([
                    'transactions',
                    'transactions as received_count' => fn ($transactions) => $transactions->where('status', 'released'),
                    'documents',
                ])
                ->when($filters['benefit_id'] ?? null, fn ($releases, $benefitId) => $releases->where('benefit_id', $benefitId))
                ->when($filters['date_from'] ?? null, fn ($releases, $from) => $releases->whereDate('release_date', '>=', $from))
                ->when($filters['date_to'] ?? null, fn ($releases, $to) => $releases->whereDate('release_date', '<=', $to))
                ->latest('release_date');
            // Leaders see releases for their own barangay, plus older ones made for every barangay.
            if ($request->user()->role === 'leader') {
                $barangayId = $request->user()->barangay_id;
                $query->where(fn ($releases) => $releases
                    ->whereDoesntHave('barangays')
                    ->orWhereHas('barangays', fn ($barangays) => $barangays->where('barangays.id', $barangayId)));
            }

            return $query->paginate($perPage, ['*'], 'page', $page)->toArray();
        });

        return response()->json($releases);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'head', 403, 'Only the Head account can schedule benefit releases.');
        $data = $request->validate([
            'benefit_id' => ['required', 'integer', 'exists:benefits,id'],
            'period_label' => ['required', 'string', 'max:100'],
            'barangay_ids' => ['required', 'array', 'min:1'],
            'barangay_ids.*' => ['integer', 'distinct', 'exists:barangays,id'],
            'release_date' => ['required', 'date'],
            'status' => ['required', 'in:scheduled,released,cancelled'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ], [
            'barangay_ids.required' => 'Select at least one barangay for this release batch.',
        ]);
        $barangayIds = array_values(array_unique($data['barangay_ids']));
        unset($data['barangay_ids']);

        // A barangay belongs to one active batch per benefit and period, so no one is paid twice.
        $taken = Barangay::query()
            ->whereIn('id', $barangayIds)
            ->whereHas('benefitReleases', fn ($releases) => $releases
                ->where('benefit_id', $data['benefit_id'])
                ->where('period_label', $data['period_label'])
                ->where('status', '!=', 'cancelled'))
            ->orderBy('barangay_name')
            ->pluck('barangay_name');
        abort_if($taken->isNotEmpty(), 422, 'Already in another release batch for '.$data['period_label'].': '.$taken->implode(', ').'.');

        $data['amount'] = Benefit::find($data['benefit_id'])?->amount;
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;
        $release = DB::transaction(function () use ($request, $data, $barangayIds) {
            $release = BenefitRelease::create($data);
            $release->barangays()->attach($barangayIds);
            if ($release->status !== 'cancelled') {
                $this->listRecipients($request, $release, $barangayIds);
            }

            return $release;
        });
        $action = $release->status === 'released' ? 'released' : 'created';
        AuditLog::record($request->user(), $action, $release, afterValue: [
            'benefit_id' => $release->benefit_id,
            'status' => $release->status,
            'amount' => $release->amount,
            'period_label' => $release->period_label,
            'barangay_ids' => $barangayIds,
            'seniors' => $release->transactions()->count(),
        ]);

        $benefitName = $release->load('benefit:id,benefit_name')->benefit->benefit_name;
        User::query()->where('role', 'leader')->where('status', 'active')->whereIn('barangay_id', $barangayIds)->each(function (User $leader) use ($release, $benefitName, $request) {
            Notification::create([
                'sender_account_id' => $request->user()->id,
                'recipient_account_id' => $leader->id,
                'message' => "{$benefitName} release is scheduled for {$release->release_date->format('F j, Y')} ({$release->period_label}).",
                'source_type' => 'benefit_release',
                'source_id' => $release->id,
                'channel' => 'in_app',
                'date_sent' => now(),
                'status' => 'unread',
            ]);
        });
        if ($release->status !== 'cancelled') {
            AdvisoryDispatcher::forBenefitRelease(
                $benefitName,
                $release->period_label,
                $release->release_date->format('F j, Y'),
                $barangayIds,
            );
        }

        return response()->json($release->load($this->relations())->loadCount('transactions'), 201);
    }

    /** The batch's roster and documents: every senior listed to receive the benefit on the release date. */
    public function show(Request $request, BenefitRelease $benefitRelease): JsonResponse
    {
        $this->authorizeBatch($request, $benefitRelease);

        return response()->json($this->detail($request, $benefitRelease));
    }

    /**
     * Closes a batch after its release day. Seniors still pending did not claim the benefit,
     * so they are recorded as not received for this period.
     */
    public function complete(Request $request, BenefitRelease $benefitRelease): JsonResponse
    {
        $this->authorizeStaff($request);
        abort_unless($benefitRelease->status === 'scheduled', 422, 'Only a scheduled release batch can be completed.');
        abort_if($benefitRelease->release_date->isFuture(), 422, 'A release batch can be completed on or after its release date.');

        $unclaimed = DB::transaction(function () use ($request, $benefitRelease) {
            $unclaimed = $benefitRelease->transactions()->where('status', 'pending')->update([
                'status' => 'failed',
                'remarks' => 'Did not claim on the release day ('.$benefitRelease->release_date->format('F j, Y').').',
                'updated_by' => $request->user()->id,
                'updated_at' => now(),
            ]);
            $benefitRelease->update([
                'status' => 'released',
                'completed_at' => now(),
                'completed_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);

            return $unclaimed;
        });
        AuditLog::record($request->user(), 'released', $benefitRelease, ['status' => 'scheduled'], [
            'status' => 'released',
            'received' => $benefitRelease->transactions()->where('status', 'released')->count(),
            'not_claimed' => $unclaimed,
        ]);

        return response()->json($this->detail($request, $benefitRelease->fresh()));
    }

    /** Signed lists, photos of the release day and other proof, kept with the batch. */
    public function uploadDocuments(Request $request, BenefitRelease $benefitRelease): JsonResponse
    {
        $this->authorizeBatch($request, $benefitRelease);
        abort_if($request->user()->role === 'head', 403, 'The Head role is read-only for release documents.');
        $request->validate([
            'documents' => ['required', 'array', 'min:1', 'max:10'],
            'documents.*' => ['file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
        ]);

        foreach ($request->file('documents') as $file) {
            $document = $benefitRelease->documents()->create([
                'path' => $file->store('release-documents', SeniorCitizen::FILE_DISK),
                'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'uploaded_by' => $request->user()->id,
            ]);
            AuditLog::record($request->user(), 'uploaded_document', $benefitRelease, afterValue: ['document' => $document->original_name]);
        }

        return response()->json($this->detail($request, $benefitRelease), 201);
    }

    public function document(Request $request, BenefitRelease $benefitRelease, ReleaseDocument $releaseDocument): StreamedResponse
    {
        $this->authorizeBatch($request, $benefitRelease);
        abort_unless($releaseDocument->benefit_release_id === $benefitRelease->id, 404);
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk(SeniorCitizen::FILE_DISK);
        abort_unless($disk->exists($releaseDocument->path), 404, 'This file is not available.');

        // Personal records: never kept by shared caches or on disk by the browser.
        return $disk->response($releaseDocument->path, $releaseDocument->original_name, ['Cache-Control' => 'private, no-store']);
    }

    /** A wrong upload can be removed by Admin or by whoever uploaded it. */
    public function destroyDocument(Request $request, BenefitRelease $benefitRelease, ReleaseDocument $releaseDocument): JsonResponse
    {
        $this->authorizeBatch($request, $benefitRelease);
        abort_unless($releaseDocument->benefit_release_id === $benefitRelease->id, 404);
        abort_unless(
            $request->user()->role === 'admin' || $releaseDocument->uploaded_by === $request->user()->id,
            403,
            'Only Admin or the person who uploaded this document can remove it.',
        );

        Storage::disk(SeniorCitizen::FILE_DISK)->delete($releaseDocument->path);
        $releaseDocument->delete();
        AuditLog::record($request->user(), 'deleted_document', $benefitRelease, ['document' => $releaseDocument->original_name]);

        return response()->json($this->detail($request, $benefitRelease));
    }

    private function detail(Request $request, BenefitRelease $release): BenefitRelease
    {
        $user = $request->user();

        return $release->load([
            ...$this->relations(),
            'completer:id,name,role',
            'documents' => fn ($documents) => $documents->with('uploader:id,name,role')->latest(),
            'transactions' => fn ($transactions) => $transactions
                ->when($user->role === 'leader', fn ($query) => $query->whereHas('senior', fn ($senior) => $senior->where('barangay_id', $user->barangay_id)))
                ->with(['senior:id,osca_id_number,first_name,middle_name,last_name,barangay_id', 'senior.barangay:id,barangay_name'])
                ->orderBy('id'),
        ]);
    }

    /** Leaders reach only batches that include their barangay, or older ones made for every barangay. */
    private function authorizeBatch(Request $request, BenefitRelease $release): void
    {
        $user = $request->user();
        if ($user->role !== 'leader') {
            return;
        }
        $covers = ! $release->barangays()->exists()
            || $release->barangays()->where('barangays.id', $user->barangay_id)->exists();
        abort_unless($covers, 403, 'This release batch is for other barangays.');
    }

    /**
     * Lists the active seniors for this benefit in the batch's barangays as pending records.
     * Seniors already listed for the period, by another batch, are skipped.
     */
    private function listRecipients(Request $request, BenefitRelease $release, array $barangayIds): void
    {
        $benefit = $release->benefit()->first();
        $ageBased = in_array($benefit?->benefit_type, AgeThresholdNotifier::PROGRAM_TYPES, true);

        $seniors = SeniorCitizen::query()
            ->where('status', 'active')
            ->whereIn('barangay_id', $barangayIds)
            ->when(
                $ageBased,
                // Age-based grants go by the senior's age on the release date, not by the
                // benefit chosen at registration. They are one-time, so past recipients are left out.
                fn ($query) => $query
                    ->whereDate('birthdate', '<=', $release->release_date->copy()->subYears($benefit->min_age))
                    ->when($benefit->max_age, fn ($query) => $query->whereDate('birthdate', '>', $release->release_date->copy()->subYears($benefit->max_age + 1)))
                    ->whereDoesntHave('benefits', fn ($received) => $received
                        ->where('benefits.id', $release->benefit_id)
                        ->where('benefit_transactions.status', 'released')),
                fn ($query) => $query->where('benefit_id', $release->benefit_id),
            )
            ->whereDoesntHave('benefits', fn ($query) => $query
                ->where('benefits.id', $release->benefit_id)
                ->where('benefit_transactions.period_label', $release->period_label))
            ->orderBy('barangay_id')
            ->orderBy('last_name')
            ->pluck('id');

        foreach ($seniors as $seniorId) {
            BenefitTransaction::create([
                'senior_citizen_id' => $seniorId,
                'benefit_id' => $release->benefit_id,
                'benefit_release_id' => $release->id,
                'distributed_by' => $request->user()->id,
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
                'amount' => $release->amount ?? 0,
                'period_label' => $release->period_label,
                'status' => 'pending',
            ]);
        }
    }

    private function relations(): array
    {
        return [
            'benefit:id,benefit_name',
            'barangays:id,barangay_name',
            'creator:id,name,role',
            'updater:id,name,role',
        ];
    }

    private function authorizeStaff(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'head'], true), 403, 'Only Admin and Head accounts can manage benefit release schedules.');
    }
}
