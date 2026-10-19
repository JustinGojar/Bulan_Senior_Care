<?php

namespace App\Support;

use App\Models\Barangay;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use Illuminate\Database\Eloquent\Builder;

/**
 * Builds the figures stored with an analytics report. Each report keeps this snapshot, so what
 * the Head approved is exactly what gets published, printed, and exported.
 */
class ReportBuilder
{
    public const MUNICIPAL_SUMMARY = 'Municipal Summary';

    public const BARANGAY_SUMMARY = 'Barangay Summary';

    public const BENEFIT_DISTRIBUTION = 'Benefit Distribution';

    public const TYPES = [self::MUNICIPAL_SUMMARY, self::BARANGAY_SUMMARY, self::BENEFIT_DISTRIBUTION];

    public static function build(string $type, ?int $barangayId): array
    {
        $seniors = SeniorCitizen::query()
            ->when($barangayId, fn (Builder $query) => $query->where('senior_citizens.barangay_id', $barangayId));
        $transactions = BenefitTransaction::query()
            ->whereIn('benefit_transactions.senior_citizen_id', (clone $seniors)->select('senior_citizens.id'));

        $snapshot = [
            'scope' => $barangayId
                ? 'Barangay '.Barangay::whereKey($barangayId)->value('barangay_name')
                : 'Municipality of Bulan',
            'totals' => self::totals($seniors),
            'barangays' => self::barangays($seniors, $transactions),
            'benefits' => self::benefits($transactions),
        ];

        if ($type === self::BARANGAY_SUMMARY) {
            $snapshot['seniors'] = self::roster($seniors);
        }
        if ($type === self::BENEFIT_DISTRIBUTION) {
            $snapshot['distribution'] = self::distribution($transactions);
        }

        return $snapshot;
    }

    private static function totals(Builder $seniors): array
    {
        $row = (clone $seniors)
            ->selectRaw(
                'COUNT(*) AS total, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS active, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS pending, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS inactive, '.
                'COALESCE(SUM(CASE WHEN sex = ? THEN 1 ELSE 0 END), 0) AS male, '.
                'COALESCE(SUM(CASE WHEN sex = ? THEN 1 ELSE 0 END), 0) AS female',
                ['active', 'pending', 'inactive', 'male', 'female'],
            )
            ->toBase()
            ->first();

        return collect((array) $row)->map(fn ($value) => (int) $value)->all();
    }

    /** Registrations and benefit releases per barangay. */
    private static function barangays(Builder $seniors, Builder $transactions): array
    {
        $releases = (clone $transactions)
            ->join('senior_citizens', 'senior_citizens.id', '=', 'benefit_transactions.senior_citizen_id')
            ->groupBy('senior_citizens.barangay_id')
            ->selectRaw(
                'senior_citizens.barangay_id, '.
                'COALESCE(SUM(CASE WHEN benefit_transactions.status = ? THEN 1 ELSE 0 END), 0) AS released, '.
                'COALESCE(SUM(CASE WHEN benefit_transactions.status = ? THEN 1 ELSE 0 END), 0) AS pending_release',
                ['released', 'pending'],
            )
            ->toBase()
            ->get()
            ->keyBy('barangay_id');

        $rows = (clone $seniors)
            ->groupBy('senior_citizens.barangay_id')
            ->selectRaw(
                'senior_citizens.barangay_id, COUNT(*) AS registered, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS active, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS pending, '.
                'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS inactive',
                ['active', 'pending', 'inactive'],
            )
            ->toBase()
            ->get();
        $names = Barangay::whereIn('id', $rows->pluck('barangay_id')->filter())->pluck('barangay_name', 'id');

        return $rows
            ->map(fn ($row) => [
                'barangay' => $names[$row->barangay_id] ?? 'Unassigned',
                'registered' => (int) $row->registered,
                'active' => (int) $row->active,
                'pending' => (int) $row->pending,
                'inactive' => (int) $row->inactive,
                'released' => (int) ($releases[$row->barangay_id]->released ?? 0),
                'pending_release' => (int) ($releases[$row->barangay_id]->pending_release ?? 0),
            ])
            ->sortBy('barangay', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    /** Benefit releases per program, by status. */
    private static function benefits(Builder $transactions): array
    {
        $benefitName = "COALESCE(benefits.benefit_name, 'Unknown')";

        return (clone $transactions)
            ->leftJoin('benefits', 'benefits.id', '=', 'benefit_transactions.benefit_id')
            ->groupByRaw($benefitName)
            ->orderByRaw('MIN(benefit_transactions.benefit_id)')
            ->selectRaw(
                "{$benefitName} AS name, ".
                'COUNT(DISTINCT benefit_transactions.senior_citizen_id) AS seniors, '.
                'COALESCE(SUM(CASE WHEN benefit_transactions.status = ? THEN 1 ELSE 0 END), 0) AS released, '.
                'COALESCE(SUM(CASE WHEN benefit_transactions.status = ? THEN 1 ELSE 0 END), 0) AS pending, '.
                'COALESCE(SUM(CASE WHEN benefit_transactions.status = ? THEN 1 ELSE 0 END), 0) AS not_released',
                ['released', 'pending', 'failed'],
            )
            ->toBase()
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'seniors' => (int) $row->seniors,
                'released' => (int) $row->released,
                'pending' => (int) $row->pending,
                'not_released' => (int) $row->not_released,
            ])
            ->all();
    }

    /** Every senior in the barangay, for the Barangay Summary. */
    private static function roster(Builder $seniors): array
    {
        return (clone $seniors)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['osca_id_number', 'first_name', 'middle_name', 'last_name', 'suffix', 'birthdate', 'sex', 'status', 'registration_date'])
            ->map(fn (SeniorCitizen $senior) => [
                'osca_id' => $senior->osca_id_number,
                'name' => self::name($senior),
                'age' => $senior->birthdate?->age ?? 0,
                'sex' => $senior->sex,
                'status' => $senior->status,
                'registration_date' => $senior->registration_date?->toDateString(),
            ])
            ->all();
    }

    /** Which senior received which benefit, and which releases are still pending. */
    private static function distribution(Builder $transactions): array
    {
        return (clone $transactions)
            ->with(['senior:id,osca_id_number,first_name,middle_name,last_name,suffix,barangay_id', 'senior.barangay:id,barangay_name', 'benefit:id,benefit_name'])
            ->orderBy('senior_citizen_id')
            ->orderBy('id')
            ->get(['id', 'senior_citizen_id', 'benefit_id', 'period_label', 'status', 'date_distributed', 'amount'])
            ->map(fn (BenefitTransaction $transaction) => [
                'osca_id' => $transaction->senior?->osca_id_number,
                'name' => $transaction->senior ? self::name($transaction->senior) : 'Unknown',
                'barangay' => $transaction->senior?->barangay?->barangay_name ?? 'Unassigned',
                'benefit' => $transaction->benefit?->benefit_name ?? 'Unknown',
                'period' => $transaction->period_label,
                'status' => $transaction->status === 'failed' ? 'not_released' : $transaction->status,
                'date_distributed' => $transaction->date_distributed?->toDateString(),
                'amount' => (float) $transaction->amount,
            ])
            ->all();
    }

    private static function name(SeniorCitizen $senior): string
    {
        return trim(implode(' ', array_filter([$senior->first_name, $senior->middle_name, $senior->last_name, $senior->suffix])));
    }
}
