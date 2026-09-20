<?php

namespace App\Http\Controllers;

use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_if($request->user()->role === 'leader', 403, 'BSCA accounts cannot view municipal analytics.');

        $data = $request->validate([
            'barangay_id' => ['nullable', 'integer', 'exists:barangays,id'],
            'gender' => ['nullable', 'in:male,female'],
            'status' => ['nullable', 'in:active,pending,inactive'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $query = SeniorCitizen::query()->with('barangay:id,barangay_name')->where('status', '!=', 'pending');
        $this->applyFilters($query, $data);
        $seniors = $query->get(['id', 'barangay_id', 'birthdate', 'sex', 'status', 'registration_date']);
        $seniorIds = $seniors->pluck('id');
        $transactions = BenefitTransaction::query()
            ->with(['senior:id,barangay_id', 'benefit:id,benefit_name'])
            ->whereIn('senior_citizen_id', $seniorIds)
            ->get(['senior_citizen_id', 'benefit_id', 'status']);

        $barangaySummary = $seniors->groupBy(fn (SeniorCitizen $senior) => $senior->barangay?->barangay_name ?? 'Unassigned')
            ->map(function ($group, $barangay) use ($transactions) {
                $ids = $group->pluck('id');
                return [
                    'barangay' => $barangay,
                    'registered' => $group->count(),
                    'active' => $group->where('status', 'active')->count(),
                    'released' => $transactions->whereIn('senior_citizen_id', $ids)->where('status', 'released')->count(),
                ];
            })->values();

        $ageDistribution = collect([60, 70, 80, 90, 100])->map(fn (int $age) => [
            'age' => $age === 100 ? '100+' : "{$age}-".($age + 9),
            'count' => $seniors->filter(function (SeniorCitizen $senior) use ($age): bool {
                $seniorAge = $senior->birthdate->age;
                return $seniorAge >= $age && ($age === 100 || $seniorAge < $age + 10);
            })->count(),
        ]);

        $benefitRecords = $transactions->groupBy(fn (BenefitTransaction $transaction) => $transaction->benefit?->benefit_name ?? 'Unknown')
            ->map(fn ($group, $name) => ['name' => $name, 'value' => $group->count()])->values();
        $runningTotal = 0;
        $trend = $barangaySummary->map(function (array $row) use (&$runningTotal) {
            $runningTotal += $row['registered'];
            return [...$row, 'municipal' => $runningTotal];
        });

        return response()->json([
            'municipal' => [
                'total_registered' => $seniors->count(),
                'active' => $seniors->where('status', 'active')->count(),
                'male' => $seniors->where('sex', 'male')->count(),
                'female' => $seniors->where('sex', 'female')->count(),
            ],
            'barangay_summary' => $barangaySummary,
            'age_distribution' => $ageDistribution,
            'benefit_records' => $benefitRecords,
            'trend' => $trend,
        ]);
    }

    private function applyFilters($query, array $data): void
    {
        if (! empty($data['barangay_id'])) $query->where('barangay_id', $data['barangay_id']);
        if (! empty($data['gender'])) $query->where('sex', $data['gender']);
        if (! empty($data['status'])) $query->where('status', $data['status']);
        if (! empty($data['from'])) $query->whereDate('registration_date', '>=', $data['from']);
        if (! empty($data['to'])) $query->whereDate('registration_date', '<=', $data['to']);
    }
}