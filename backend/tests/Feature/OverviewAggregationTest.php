<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OverviewAggregationTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_aggregates_senior_and_benefit_totals_without_changing_the_response(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        $benefit = Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'max_age' => null,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);
        $releasedSenior = $this->createSenior($admin, $barangay, 'OSCA-RELEASED', 'active');
        $this->createSenior($admin, $barangay, 'OSCA-PENDING', 'pending');
        $this->createSenior($admin, $barangay, 'OSCA-INACTIVE', 'inactive');

        foreach ([
            [$releasedSenior, 'released', 3000, '2026-Q1'],
            [$releasedSenior, 'pending', 1000, '2026-Q2'],
            [$releasedSenior, 'failed', 500, '2026-Q3'],
        ] as [$senior, $status, $amount, $period]) {
            BenefitTransaction::create([
                'senior_citizen_id' => $senior->id,
                'benefit_id' => $benefit->id,
                'distributed_by' => $admin->id,
                'amount' => $amount,
                'period_label' => $period,
                'status' => $status,
            ]);
        }

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/overview')
            ->assertOk()
            ->assertJsonPath('total_registered', 3)
            ->assertJsonPath('active_seniors', 1)
            ->assertJsonPath('pending_applications', 1)
            ->assertJsonPath('benefits_distributed_amount', 3000)
            ->assertJsonPath('benefits_distributed_count', 1)
            ->assertJsonPath('benefits_pending_count', 1)
            ->assertJsonPath('benefits_failed_count', 1)
            ->assertJsonPath('distribution_percentage', 33)
            ->assertJsonPath('received_by_benefit.0.received_count', 1);
    }

    public function test_president_overview_only_aggregates_seniors_they_encoded_in_their_barangay(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        $otherBarangay = Barangay::create(['barangay_name' => 'Zone 2']);
        /** @var User $president */
        $president = User::factory()->create([
            'role' => 'president',
            'barangay_id' => $barangay->id,
        ]);
        $benefit = Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'max_age' => null,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);
        $localSenior = $this->createSenior($president, $barangay, 'OSCA-LOCAL', 'active');
        $otherSenior = $this->createSenior($president, $otherBarangay, 'OSCA-OTHER', 'active');

        foreach ([$localSenior, $otherSenior] as $senior) {
            BenefitTransaction::create([
                'senior_citizen_id' => $senior->id,
                'benefit_id' => $benefit->id,
                'distributed_by' => $president->id,
                'amount' => 3000,
                'period_label' => '2026-Q1',
                'status' => 'released',
            ]);
        }

        $this->actingAs($president, 'sanctum')
            ->getJson('/api/overview')
            ->assertOk()
            ->assertJsonPath('total_registered', 1)
            ->assertJsonPath('benefits_distributed_amount', 3000)
            ->assertJsonPath('benefits_distributed_count', 1)
            ->assertJsonPath('received_by_benefit.0.received_count', 1);
    }

    public function test_overview_reports_growth_of_each_total_since_the_end_of_last_month(): void
    {
        Carbon::setTestNow('2026-10-05 12:00:00');

        try {
            /** @var User $admin */
            $admin = User::factory()->create(['role' => 'admin']);
            $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
            $benefit = Benefit::create([
                'benefit_name' => 'Social Pension',
                'benefit_type' => 'social_pension',
                'min_age' => 60,
                'max_age' => null,
                'amount' => 3000,
                'funding_source' => 'national',
                'schedule' => 'quarterly',
                'status' => 'active',
            ]);
            $lastMonthActive = $this->createSenior($admin, $barangay, 'OSCA-SEPT-ACTIVE', 'active');
            $lastMonthPending = $this->createSenior($admin, $barangay, 'OSCA-SEPT-PENDING', 'pending');
            $this->createSenior($admin, $barangay, 'OSCA-OCT-ACTIVE-1', 'active');

            $lastMonthActive->forceFill(['created_at' => '2026-09-02 12:00:00'])->save();
            $lastMonthPending->forceFill(['created_at' => '2026-09-03 12:00:00'])->save();
            foreach (['OSCA-OCT-ACTIVE-1'] as $oscaId) {
                SeniorCitizen::where('osca_id_number', $oscaId)
                    ->update(['created_at' => '2026-10-02 12:00:00']);
            }

            foreach ([
                [$lastMonthActive, '1000', '2026-09-02'],
                [SeniorCitizen::where('osca_id_number', 'OSCA-OCT-ACTIVE-1')->firstOrFail(), '500', '2026-10-02'],
            ] as [$senior, $amount, $dateDistributed]) {
                BenefitTransaction::create([
                    'senior_citizen_id' => $senior->id,
                    'benefit_id' => $benefit->id,
                    'distributed_by' => $admin->id,
                    'amount' => $amount,
                    'period_label' => $dateDistributed,
                    'date_distributed' => $dateDistributed,
                    'status' => 'released',
                ]);
            }

            $this->actingAs($admin, 'sanctum')
                ->getJson('/api/overview')
                ->assertOk()
                ->assertJsonPath('monthly_change.total_registered', 50)
                ->assertJsonPath('monthly_change.active_seniors', 100)
                ->assertJsonPath('monthly_change.pending_applications', 0)
                ->assertJsonPath('monthly_change.benefits_distributed_amount', 50);
        } finally {
            Carbon::setTestNow();
        }
    }

    private function createSenior(User $encoder, Barangay $barangay, string $oscaId, string $status): SeniorCitizen
    {
        return SeniorCitizen::create([
            'osca_id_number' => $oscaId,
            'barangay_id' => $barangay->id,
            'encoded_by' => $encoder->id,
            'first_name' => 'Test',
            'last_name' => $oscaId,
            'birthdate' => now()->subYears(70)->toDateString(),
            'sex' => 'female',
            'registration_date' => now()->toDateString(),
            'status' => $status,
        ]);
    }
}
