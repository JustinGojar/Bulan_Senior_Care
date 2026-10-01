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

        return response()->json(AuditLog::query()
            ->with('actor:id,name,role')
            ->latest('created_at')
            ->paginate($perPage));
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can access system data tools.');
    }
}
