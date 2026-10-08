<?php

namespace App\Http\Controllers;

use App\Models\AnalyticsReport;
use App\Models\AuditLog;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private const RELATIONS = ['generator:id,name,role', 'approver:id,name,role'];

    public function index(Request $request): JsonResponse
    {
        $this->authorizeStaff($request);

        return response()->json(AnalyticsReport::with(self::RELATIONS)->latest()->latest('id')->limit(50)->get());
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can draft reports.');
        $data = $request->validate([
            'report_type' => ['required', 'string', 'max:120'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $report = AnalyticsReport::create([
            ...$data,
            'generated_by' => $request->user()->id,
            'generated_date' => today(),
            'total_registered' => SeniorCitizen::count(),
            'status' => 'draft',
        ]);
        AuditLog::record($request->user(), 'created', $report, afterValue: ['status' => 'draft', 'report_type' => $report->report_type]);
        User::where('role', 'head')->where('status', 'active')->each(fn (User $head) => DB::table('notifications')->insert([
            'sender_account_id' => $request->user()->id,
            'recipient_account_id' => $head->id,
            'message' => "Report \"{$report->report_type}\" is waiting for your approval.",
            'channel' => 'in_app',
            'status' => 'unread',
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json($report->load(self::RELATIONS), 201);
    }

    public function update(Request $request, AnalyticsReport $report): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:approved,published']]);
        $role = $request->user()->role;
        $before = $report->status;

        if ($data['status'] === 'approved') {
            abort_unless($role === 'head', 403, 'Only Head can approve reports.');
            abort_unless($before === 'draft', 422, 'Only draft reports can be approved.');
            $report->update(['status' => 'approved', 'approved_by' => $request->user()->id]);
        } else {
            abort_unless($role === 'admin', 403, 'Only Admin can publish reports.');
            abort_unless($before === 'approved', 422, 'Only approved reports can be published.');
            $report->update(['status' => 'published', 'published_at' => now()]);
        }
        AuditLog::record($request->user(), $data['status'], $report, ['status' => $before], ['status' => $report->status]);

        return response()->json($report->fresh(self::RELATIONS));
    }

    private function authorizeStaff(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'head'], true), 403, 'Only Admin and Head accounts can view reports.');
    }
}
