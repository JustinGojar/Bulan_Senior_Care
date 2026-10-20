<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemDataController extends Controller
{
    public function auditLogs(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $perPage = min(100, max(10, $request->integer('per_page', 25)));
        $filters = $request->validate([
            'user_id' => ['nullable', 'integer'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ], [
            'date_to.after_or_equal' => 'The end date must be on or after the start date.',
        ]);

        return response()->json(AuditLog::query()
            ->with('actor:id,name,role')
            ->when($filters['user_id'] ?? null, fn ($logs, $userId) => $logs->where('actor_id', $userId))
            ->when($filters['date_from'] ?? null, fn ($logs, $from) => $logs->whereDate('created_at', '>=', $from))
            ->when($filters['date_to'] ?? null, fn ($logs, $to) => $logs->whereDate('created_at', '<=', $to))
            ->latest('created_at')
            ->latest('id')
            ->paginate($perPage));
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can access system data tools.');
    }
}
