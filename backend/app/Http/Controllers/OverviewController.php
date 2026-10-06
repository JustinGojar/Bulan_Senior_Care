<?php

namespace App\Http\Controllers;

use App\Models\SeniorCitizen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class OverviewController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $cacheKey = "overview:{$request->user()->id}:{$request->user()->role}:{$request->user()->barangay_id}";

        return response()->json(Cache::remember($cacheKey, now()->addSeconds(3), function () use ($request) {
            $now = now();
            $currentMonthStart = $now->copy()->startOfMonth();
            $previousMonthStart = $currentMonthStart->copy()->subMonth();
            $previousMonthEnd = $previousMonthStart->copy()
                ->addDays(min($now->day, $previousMonthStart->daysInMonth) - 1)
                ->endOfDay();
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
            $seniorStats = $registeredQuery
                ->selectRaw(
                    'COUNT(*) AS total_registered, '.
                    'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS active_seniors, '.
                    'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS pending_applications',
                    ['active', 'pending'],
                )
                ->first();

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
            $transactionStats = $transactions
                ->selectRaw(
                    'COUNT(*) AS transaction_count, '.
                    'COALESCE(SUM(CASE WHEN status = ? THEN amount ELSE 0 END), 0) AS distributed_amount, '.
                    'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS distributed_count, '.
                    'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS pending_count, '.
                    'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS failed_count',
                    ['released', 'released', 'pending', 'failed'],
                )
                ->first();

            $countSeniorsForPeriod = static function ($start, $end, ?string $status = null) use ($isLeader, $leaderId, $barangayId): int {
                $query = SeniorCitizen::query()->whereBetween('created_at', [$start, $end]);
                if ($status !== null) {
                    $query->where('status', $status);
                }
                if ($isLeader) {
                    $query->where('barangay_id', $barangayId)->where('encoded_by', $leaderId);
                }

                return $query->count();
            };
            $distributedAmountForPeriod = static function ($start, $end) use ($transactionScope): float {
                $query = DB::table('benefit_transactions')
                    ->where('benefit_transactions.status', 'released')
                    ->whereBetween('benefit_transactions.date_distributed', [
                        $start->toDateString(),
                        $end->toDateString(),
                    ]);
                $transactionScope($query);

                return (float) $query->sum('benefit_transactions.amount');
            };
            $monthlyMetrics = static function ($start, $end) use ($countSeniorsForPeriod, $distributedAmountForPeriod): array {
                return [
                    'total_registered' => $countSeniorsForPeriod($start, $end),
                    'active_seniors' => $countSeniorsForPeriod($start, $end, 'active'),
                    'pending_applications' => $countSeniorsForPeriod($start, $end, 'pending'),
                    'benefits_distributed_amount' => $distributedAmountForPeriod($start, $end),
                ];
            };
            $currentMonthMetrics = $monthlyMetrics($currentMonthStart, $now);
            $previousMonthMetrics = $monthlyMetrics($previousMonthStart, $previousMonthEnd);
            $monthlyChange = [];
            foreach ($currentMonthMetrics as $metric => $currentValue) {
                $previousValue = $previousMonthMetrics[$metric];
                $monthlyChange[$metric] = $previousValue > 0
                    ? (int) round((($currentValue - $previousValue) / $previousValue) * 100)
                    : null;
            }

            $receivedByBenefitQuery = DB::table('benefit_transactions')
                ->join('benefits', 'benefits.id', '=', 'benefit_transactions.benefit_id')
                ->join('senior_citizens', 'senior_citizens.id', '=', 'benefit_transactions.senior_citizen_id')
                ->where('benefit_transactions.status', 'released');
            $seniorScope($receivedByBenefitQuery);
            $receivedByBenefit = $receivedByBenefitQuery
                ->select('benefits.benefit_name', 'benefits.min_age', 'benefits.max_age', DB::raw('COUNT(DISTINCT benefit_transactions.senior_citizen_id) as received_count'))
                ->groupBy('benefits.id', 'benefits.benefit_name', 'benefits.min_age', 'benefits.max_age')
                ->orderBy('benefits.min_age')
                ->get()
                ->map(fn ($row) => [
                    'benefit' => $row->benefit_name,
                    'age_range' => $row->max_age ? "{$row->min_age}-{$row->max_age}" : "{$row->min_age}+",
                    'received_count' => (int) $row->received_count,
                ]);

            return [
                'total_registered' => (int) $seniorStats->total_registered,
                'active_seniors' => (int) $seniorStats->active_seniors,
                'pending_applications' => (int) $seniorStats->pending_applications,
                'benefits_distributed_amount' => (float) $transactionStats->distributed_amount,
                'benefits_distributed_count' => (int) $transactionStats->distributed_count,
                'benefits_pending_count' => (int) $transactionStats->pending_count,
                'benefits_failed_count' => (int) $transactionStats->failed_count,
                'monthly_change' => $monthlyChange,
                'distribution_percentage' => $transactionStats->transaction_count > 0
                    ? round(($transactionStats->distributed_count / $transactionStats->transaction_count) * 100)
                    : 0,
                'received_by_benefit' => $receivedByBenefit,
            ];
        }));
    }
}
