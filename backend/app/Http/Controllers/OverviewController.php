<?php

namespace App\Http\Controllers;

use App\Models\SeniorCitizen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OverviewController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $isLeader = $request->user()->role === 'leader';
        $leaderId = $request->user()->id;
        $barangayId = $request->user()->barangay_id;
        $seniorScope = static function ($query) use ($isLeader, $leaderId, $barangayId): void {
            if ($isLeader) {
                $query->where('senior_citizens.barangay_id', $barangayId)
                    ->where('senior_citizens.encoded_by', $leaderId);
            }
        };

        $registeredQuery = SeniorCitizen::query();
        if ($isLeader) {
            $registeredQuery->where('barangay_id', $barangayId)->where('encoded_by', $leaderId);
        }
        $registered = (clone $registeredQuery)->count();
        $active = (clone $registeredQuery)->where('status', 'active')->count();
        $pending = (clone $registeredQuery)->where('status', 'pending')->count();
        $transactions = DB::table('benefit_transactions');
        $transactionScope = static function ($query) use ($seniorScope): void {
            $query->whereExists(function ($seniorQuery) use ($seniorScope): void {
                $seniorQuery->selectRaw('1')
                    ->from('senior_citizens')
                    ->whereColumn('senior_citizens.id', 'benefit_transactions.senior_citizen_id');
                $seniorScope($seniorQuery);
            });
        };
        $transactionScope($transactions);
        $distributed = (clone $transactions)->where('status', 'released');
        $transactionCount = $transactions->count();
        $receivedByBenefit = DB::table('benefit_transactions')
            ->join('benefits', 'benefits.id', '=', 'benefit_transactions.benefit_id')
            ->join('senior_citizens', 'senior_citizens.id', '=', 'benefit_transactions.senior_citizen_id')
            ->where('benefit_transactions.status', 'released')
            ->whereExists(function ($seniorQuery) use ($seniorScope): void {
                $seniorQuery->selectRaw('1')
                    ->from('senior_citizens')
                    ->whereColumn('senior_citizens.id', 'benefit_transactions.senior_citizen_id');
                $seniorScope($seniorQuery);
            })
            ->select('benefits.benefit_name', 'benefits.min_age', 'benefits.max_age', DB::raw('COUNT(DISTINCT benefit_transactions.senior_citizen_id) as received_count'))
            ->groupBy('benefits.id', 'benefits.benefit_name', 'benefits.min_age', 'benefits.max_age')
            ->orderBy('benefits.min_age')
            ->get()
            ->map(fn ($row) => [
                'benefit' => $row->benefit_name,
                'age_range' => $row->max_age ? "{$row->min_age}-{$row->max_age}" : "{$row->min_age}+",
                'received_count' => (int) $row->received_count,
            ]);

        return response()->json([
            'total_registered' => $registered,
            'active_seniors' => $active,
            'pending_applications' => $pending,
            'benefits_distributed_amount' => (float) $distributed->sum('amount'),
            'benefits_distributed_count' => $distributed->count(),
            'benefits_pending_count' => (clone $transactions)->where('status', 'pending')->count(),
            'benefits_failed_count' => (clone $transactions)->where('status', 'failed')->count(),
            'distribution_percentage' => $transactionCount > 0
                ? round(($distributed->count() / $transactionCount) * 100)
                : 0,
            'received_by_benefit' => $receivedByBenefit,
        ]);
    }
}
