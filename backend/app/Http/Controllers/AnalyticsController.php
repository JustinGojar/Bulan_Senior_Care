<?php

namespace App\Http\Controllers;

use App\Models\Barangay;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AnalyticsController extends Controller
{
    private const AGE_BRACKETS = [60, 70, 80, 90, 100];

    /** Column alias => [first age, last age] for each milestone benefit. */
    private const MILESTONE_BENEFITS = [
        'octogenarian' => [80, 85],
        'nonagenarian' => [90, 95],
        'centenarian' => [100, 100],
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $isLeader = $request->user()->role === 'leader';
        abort_if($isLeader && ! $request->user()->barangay_id, 403, 'Leader account does not have an assigned barangay.');

        $data = $request->validate([
            'barangay_id' => ['nullable', 'integer', 'exists:barangays,id'],
            'gender' => ['nullable', 'in:male,female'],
            'status' => ['nullable', 'in:active,pending,inactive'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $user = $request->user();
        $cacheKey = "analytics:{$user->id}:{$user->role}:{$user->barangay_id}:".sha1(json_encode($data));

        return response()->json(Cache::remember($cacheKey, now()->addSeconds(3), fn () => $this->summarize($request, $data)));
    }

    private function summarize(Request $request, array $data): array
    {
        $isLeader = $request->user()->role === 'leader';

        // All counting happens in the database so the response time stays flat as records grow.
        $seniors = SeniorCitizen::query()->where('senior_citizens.status', '!=', 'pending');
        if ($isLeader) {
            $seniors->where('senior_citizens.barangay_id', $request->user()->barangay_id);
        } else {
            $this->applyFilters($seniors, $data);
        }

        $ageSelects = [];
        $ageBindings = [];
        foreach (self::AGE_BRACKETS as $age) {
            // Someone is at least N years old when they were born on or before today minus N years.
            $ageSelects[] = $age === 100
                ? 'COALESCE(SUM(CASE WHEN birthdate <= ? THEN 1 ELSE 0 END), 0) AS age_'.$age
                : 'COALESCE(SUM(CASE WHEN birthdate <= ? AND birthdate > ? THEN 1 ELSE 0 END), 0) AS age_'.$age;
            // End-of-day bounds compare correctly against both DATE columns and SQLite's datetime text.
            $ageBindings[] = now()->subYearsNoOverflow($age)->toDateString().' 23:59:59';
            if ($age !== 100) {
                $ageBindings[] = now()->subYearsNoOverflow($age + 10)->toDateString().' 23:59:59';
            }
        }
        // Expanded Centenarians Act age bands; every other age gets Social Pension.
        // Mirrors benefitForAge() in the frontend so charts match the registration form.
        foreach (self::MILESTONE_BENEFITS as $column => [$from, $to]) {
            $ageSelects[] = "COALESCE(SUM(CASE WHEN birthdate <= ? AND birthdate > ? THEN 1 ELSE 0 END), 0) AS {$column}";
            $ageBindings[] = now()->subYearsNoOverflow($from)->toDateString().' 23:59:59';
            $ageBindings[] = now()->subYearsNoOverflow($to + 1)->toDateString().' 23:59:59';
        }

        $totals = (clone $seniors)
            ->selectRaw(
                'COUNT(*) AS total_registered, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS active, '.
                'COALESCE(SUM(CASE WHEN sex = ? THEN 1 ELSE 0 END), 0) AS male, '.
                'COALESCE(SUM(CASE WHEN sex = ? THEN 1 ELSE 0 END), 0) AS female, '.
                implode(', ', $ageSelects),
                ['active', 'male', 'female', ...$ageBindings],
            )
            ->toBase()
            ->first();

        $transactions = BenefitTransaction::query()
            ->whereIn('benefit_transactions.senior_citizen_id', (clone $seniors)->select('senior_citizens.id'));

        $releasedByBarangay = (clone $transactions)
            ->join('senior_citizens', 'senior_citizens.id', '=', 'benefit_transactions.senior_citizen_id')
            ->where('benefit_transactions.status', 'released')
            ->groupBy('senior_citizens.barangay_id')
            ->selectRaw('senior_citizens.barangay_id, COUNT(*) AS released')
            ->toBase()
            ->pluck('released', 'barangay_id');

        $barangayRows = (clone $seniors)
            ->selectRaw(
                'barangay_id, COUNT(*) AS registered, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS active',
                ['active'],
            )
            ->groupBy('barangay_id')
            ->orderByRaw('MIN(senior_citizens.id)')
            ->toBase()
            ->get();
        $barangayNames = Barangay::query()
            ->whereIn('id', $barangayRows->pluck('barangay_id')->filter())
            ->pluck('barangay_name', 'id');

        $barangaySummary = [];
        foreach ($barangayRows as $row) {
            $name = $barangayNames[$row->barangay_id] ?? 'Unassigned';
            $barangaySummary[$name] ??= ['barangay' => $name, 'registered' => 0, 'active' => 0, 'released' => 0];
            $barangaySummary[$name]['registered'] += (int) $row->registered;
            $barangaySummary[$name]['active'] += (int) $row->active;
            $barangaySummary[$name]['released'] += (int) ($releasedByBarangay[$row->barangay_id] ?? 0);
        }
        $barangaySummary = collect(array_values($barangaySummary));

        $ageDistribution = collect(self::AGE_BRACKETS)->map(fn (int $age) => [
            'age' => $age === 100 ? '100+' : "{$age}-".($age + 9),
            'count' => (int) $totals->{'age_'.$age},
        ]);

        $benefitName = "COALESCE(benefits.benefit_name, 'Unknown')";
        $benefitTotals = (clone $transactions)
            ->leftJoin('benefits', 'benefits.id', '=', 'benefit_transactions.benefit_id')
            ->groupByRaw($benefitName)
            ->orderByRaw('MIN(benefit_transactions.id)');
        // Seniors per benefit by the age rule, so records always match each senior's age.
        $octogenarian = (int) $totals->octogenarian;
        $nonagenarian = (int) $totals->nonagenarian;
        $centenarian = (int) $totals->centenarian;
        $benefitRecords = collect([
            ['name' => 'Social Pension', 'value' => (int) $totals->total_registered - $octogenarian - $nonagenarian - $centenarian],
            ['name' => 'Octogenarian Grant', 'value' => $octogenarian],
            ['name' => 'Nonagenarian Grant', 'value' => $nonagenarian],
            ['name' => 'Centenarian Award', 'value' => $centenarian],
        ])->filter(fn (array $record) => $record['value'] > 0)->values();
        $releasedBenefitRecords = (clone $benefitTotals)
            ->where('benefit_transactions.status', 'released')
            ->selectRaw("{$benefitName} AS name, COUNT(DISTINCT benefit_transactions.senior_citizen_id) AS senior_count")
            ->toBase()
            ->get()
            ->map(fn ($row) => ['name' => $row->name, 'senior_count' => (int) $row->senior_count]);
        // Release progress per program: benefit releases (transactions) in each status.
        $benefitStatusRecords = (clone $benefitTotals)
            ->selectRaw(
                "{$benefitName} AS name, ".
                'COALESCE(SUM(CASE WHEN benefit_transactions.status = ? THEN 1 ELSE 0 END), 0) AS released, '.
                'COALESCE(SUM(CASE WHEN benefit_transactions.status = ? THEN 1 ELSE 0 END), 0) AS pending, '.
                'COALESCE(SUM(CASE WHEN benefit_transactions.status = ? THEN 1 ELSE 0 END), 0) AS not_released',
                ['released', 'pending', 'failed'],
            )
            ->toBase()
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'released' => (int) $row->released,
                'pending' => (int) $row->pending,
                'not_released' => (int) $row->not_released,
            ]);

        $runningTotal = 0;
        $trend = $barangaySummary->map(function (array $row) use (&$runningTotal) {
            $runningTotal += $row['registered'];

            return [...$row, 'municipal' => $runningTotal];
        });

        return [
            'municipal' => [
                'total_registered' => (int) $totals->total_registered,
                'active' => (int) $totals->active,
                'male' => (int) $totals->male,
                'female' => (int) $totals->female,
            ],
            'barangay_summary' => $barangaySummary->all(),
            'age_distribution' => $ageDistribution->all(),
            'benefit_records' => $benefitRecords->all(),
            'released_benefit_records' => $releasedBenefitRecords->all(),
            'benefit_status_records' => $benefitStatusRecords->all(),
            'trend' => $trend->values()->all(),
        ];
    }

    private function applyFilters(Builder $query, array $data): void
    {
        if (! empty($data['barangay_id'])) {
            $query->where('senior_citizens.barangay_id', $data['barangay_id']);
        }
        if (! empty($data['gender'])) {
            $query->where('senior_citizens.sex', $data['gender']);
        }
        if (! empty($data['status'])) {
            $query->where('senior_citizens.status', $data['status']);
        }
        if (! empty($data['from'])) {
            $query->whereDate('senior_citizens.registration_date', '>=', $data['from']);
        }
        if (! empty($data['to'])) {
            $query->whereDate('senior_citizens.registration_date', '<=', $data['to']);
        }
    }
}
