<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
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

    public function test_leader_overview_only_aggregates_seniors_they_encoded_in_their_barangay(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        $otherBarangay = Barangay::create(['barangay_name' => 'Zone 2']);
        /** @var User $leader */
        $leader = User::factory()->create([
            'role' => 'leader',
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
        $localSenior = $this->createSenior($leader, $barangay, 'OSCA-LOCAL', 'active');
        $otherSenior = $this->createSenior($leader, $otherBarangay, 'OSCA-OTHER', 'active');

        foreach ([$localSenior, $otherSenior] as $senior) {
            BenefitTransaction::create([
                'senior_citizen_id' => $senior->id,
                'benefit_id' => $benefit->id,
                'distributed_by' => $leader->id,
                'amount' => 3000,
                'period_label' => '2026-Q1',
                'status' => 'released',
            ]);
        }

        $this->actingAs($leader, 'sanctum')
            ->getJson('/api/overview')
            ->assertOk()
            ->assertJsonPath('total_registered', 1)
            ->assertJsonPath('benefits_distributed_amount', 3000)
            ->assertJsonPath('benefits_distributed_count', 1)
            ->assertJsonPath('received_by_benefit.0.received_count', 1);
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
