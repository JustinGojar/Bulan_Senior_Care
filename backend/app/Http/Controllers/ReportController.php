<?php

namespace App\Http\Controllers;

use App\Models\AnalyticsReport;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\User;
use App\Support\ReportBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    private const RELATIONS = ['generator:id,name,role', 'approver:id,name,role', 'publisher:id,name,role', 'barangay:id,barangay_name'];

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->visibleReports($request)->with(self::RELATIONS)->latest()->latest('id')->limit(50)->get(),
        );
    }

    public function show(Request $request, int $report): JsonResponse
    {
        $found = $this->visibleReports($request)->with(self::RELATIONS)->findOrFail($report);
        // Reports made before figures were saved get them now, once, from the current records.
        if ($found->snapshot === null) {
            $found->update(['snapshot' => ReportBuilder::build($found->report_type, $found->barangay_id)]);
        }

        return response()->json($found->makeVisible('snapshot'));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can generate reports.');
        $data = $request->validate([
            'report_type' => ['required', Rule::in(ReportBuilder::TYPES)],
            'barangay_id' => [
                Rule::requiredIf($request->input('report_type') === ReportBuilder::BARANGAY_SUMMARY),
                Rule::prohibitedIf($request->input('report_type') === ReportBuilder::MUNICIPAL_SUMMARY),
                'nullable', 'integer', 'exists:barangays,id',
            ],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $snapshot = ReportBuilder::build($data['report_type'], $data['barangay_id'] ?? null);
        $report = AnalyticsReport::create([
            ...$data,
            'generated_by' => $request->user()->id,
            'generated_date' => today(),
            'total_registered' => $snapshot['totals']['total'],
            'status' => 'draft',
            'snapshot' => $snapshot,
        ]);
        AuditLog::record($request->user(), 'created', $report, afterValue: ['status' => 'draft', 'report_type' => $report->report_type]);
        $this->notifyHeads($request->user(), $report, "Report \"{$this->title($report)}\" is waiting for your review.");

        return response()->json($report->load(self::RELATIONS)->makeVisible('snapshot'), 201);
    }

    public function update(Request $request, AnalyticsReport $report): JsonResponse
    {
        $this->authorizeStaff($request);
        $data = $request->validate([
            'status' => ['required', 'in:approved,returned,published,draft'],
            'review_remarks' => [Rule::requiredIf($request->input('status') === 'returned'), 'nullable', 'string', 'max:1000'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);
        $user = $request->user();
        $before = $report->status;

        match ($data['status']) {
            'approved' => $this->approve($user, $report),
            'returned' => $this->returnForRevision($user, $report, $data['review_remarks']),
            'published' => $this->publish($user, $report),
            'draft' => $this->resubmit($user, $report, $data),
        };
        AuditLog::record($user, $data['status'], $report, ['status' => $before], ['status' => $report->status]);

        return response()->json($report->fresh(self::RELATIONS)->makeVisible('snapshot'));
    }

    private function approve(User $user, AnalyticsReport $report): void
    {
        abort_unless($user->role === 'head', 403, 'Only Head can approve reports.');
        abort_unless($report->status === 'draft', 422, 'Only reports waiting for review can be approved.');
        $report->update(['status' => 'approved', 'approved_by' => $user->id, 'review_remarks' => null]);
    }

    private function returnForRevision(User $user, AnalyticsReport $report, string $remarks): void
    {
        abort_unless($user->role === 'head', 403, 'Only Head can return reports for revision.');
        abort_unless(in_array($report->status, ['draft', 'approved'], true), 422, 'Published reports can no longer be returned.');
        $report->update(['status' => 'returned', 'approved_by' => null, 'review_remarks' => $remarks]);
        $this->notify($user, collect([$report->generator]), $report, "Report \"{$this->title($report)}\" was returned for revision: {$remarks}");
    }

    private function publish(User $user, AnalyticsReport $report): void
    {
        abort_unless($user->role === 'head', 403, 'Only Head can publish reports.');
        abort_unless($report->status === 'approved', 422, 'Only approved reports can be published.');
        $report->update(['status' => 'published', 'published_by' => $user->id, 'published_at' => now()]);

        $message = "Report \"{$this->title($report)}\" has been published.";
        $this->notify($user, User::where('role', 'admin')->where('status', 'active')->get()->push($report->generator), $report, $message);
        $this->notify($user, $this->leaderRecipients($report), $report, $message);
    }

    /** Regenerates a returned report from the latest records and sends it back for review. */
    private function resubmit(User $user, AnalyticsReport $report, array $data): void
    {
        abort_unless($user->role === 'admin', 403, 'Only Admin can revise reports.');
        abort_unless($report->status === 'returned', 422, 'Only returned reports can be resubmitted.');
        $snapshot = ReportBuilder::build($report->report_type, $report->barangay_id);
        $report->update([
            'status' => 'draft',
            'generated_date' => today(),
            'total_registered' => $snapshot['totals']['total'],
            'snapshot' => $snapshot,
            'remarks' => array_key_exists('remarks', $data) ? $data['remarks'] : $report->remarks,
        ]);
        $this->notifyHeads($user, $report, "Report \"{$this->title($report)}\" was revised and is waiting for your review.");
    }

    /**
     * Admin and Head see every report. A BSCA President sees published reports for their own
     * barangay, plus the Municipal Summary, which holds totals only and no senior's details.
     */
    private function visibleReports(Request $request): Builder
    {
        $user = $request->user();
        if (in_array($user->role, ['admin', 'head'], true)) {
            return AnalyticsReport::query();
        }
        abort_unless($user->role === 'leader' && $user->barangay_id, 403, 'You cannot view reports.');

        return AnalyticsReport::query()
            ->where('status', 'published')
            ->where(fn (Builder $query) => $query
                ->where('barangay_id', $user->barangay_id)
                ->orWhere(fn (Builder $query) => $query->whereNull('barangay_id')->where('report_type', ReportBuilder::MUNICIPAL_SUMMARY)));
    }

    private function leaderRecipients(AnalyticsReport $report): Collection
    {
        $leaders = User::where('role', 'leader')->where('status', 'active');
        if ($report->barangay_id) {
            return $leaders->where('barangay_id', $report->barangay_id)->get();
        }

        return $report->report_type === ReportBuilder::MUNICIPAL_SUMMARY ? $leaders->get() : collect();
    }

    private function notifyHeads(User $sender, AnalyticsReport $report, string $message): void
    {
        $this->notify($sender, User::where('role', 'head')->where('status', 'active')->get(), $report, $message);
    }

    private function notify(User $sender, Collection $recipients, AnalyticsReport $report, string $message): void
    {
        $recipients->filter()->unique('id')->reject(fn (User $user) => $user->id === $sender->id)
            ->each(fn (User $recipient) => Notification::create([
                'sender_account_id' => $sender->id,
                'recipient_account_id' => $recipient->id,
                'message' => $message,
                'source_type' => 'report',
                'source_id' => $report->id,
                'channel' => 'in_app',
                'date_sent' => now(),
                'status' => 'unread',
            ]));
    }

    private function title(AnalyticsReport $report): string
    {
        $barangay = $report->barangay_id ? $report->loadMissing('barangay:id,barangay_name')->barangay?->barangay_name : null;

        return $barangay ? "{$report->report_type} — {$barangay}" : $report->report_type;
    }

    private function authorizeStaff(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'head'], true), 403, 'Only Admin and Head accounts can manage reports.');
    }
}
