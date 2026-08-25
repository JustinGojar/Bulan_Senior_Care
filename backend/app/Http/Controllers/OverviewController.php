<?php

namespace App\Http\Controllers;

use App\Models\SeniorCitizen;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class OverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $registered = SeniorCitizen::count();
        $active = SeniorCitizen::where('status', 'active')->count();
        $pending = SeniorCitizen::where('status', 'pending')->count();
        $transactions = DB::table('benefit_transactions');
        $distributed = (clone $transactions)->where('status', 'released');
        $transactionCount = $transactions->count();

        return response()->json([
            'total_registered' => $registered,
            'active_seniors' => $active,
            'pending_applications' => $pending,
            'benefits_distributed_amount' => (float) $distributed->sum('amount'),
            'benefits_distributed_count' => $distributed->count(),
            'distribution_percentage' => $transactionCount > 0
                ? round(($distributed->count() / $transactionCount) * 100)
                : 0,
        ]);
    }
}
