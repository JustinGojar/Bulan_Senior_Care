<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsLeaderScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_leader_analytics_only_includes_the_assigned_barangay(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        $otherBarangay = Barangay::create(['barangay_name' => 'Zone 2']);
        /** @var User $leader */
        $leader = User::factory()->create([
            'role' => 'leader',
            'barangay_id' => $barangay->id,
        ]);
        $localSenior = $this->createSenior($leader, $barangay, 'OSCA-LOCAL-001', 70);
        $this->createSenior($leader, $otherBarangay, 'OSCA-OTHER-001', 100);
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
        BenefitTransaction::create([
            'senior_citizen_id' => $localSenior->id,
            'benefit_id' => $benefit->id,
            'distributed_by' => $leader->id,
            'amount' => 3000,
            'status' => 'released',
        ]);

        $this->actingAs($leader, 'sanctum')
            ->getJson('/api/analytics?barangay_id='.$otherBarangay->id)
            ->assertOk()
            ->assertJsonPath('municipal.total_registered', 1)
            ->assertJsonPath('barangay_summary.0.barangay', 'Zone 1')
            ->assertJsonPath('barangay_summary.0.registered', 1)
            ->assertJsonPath('barangay_summary.0.released', 1)
            ->assertJsonPath('age_distribution.1.count', 1)
            ->assertJsonPath('age_distribution.4.count', 0)
            ->assertJsonPath('benefit_records.0.value', 1);
    }

    private function createSenior(User $encoder, Barangay $barangay, string $oscaId, int $age): SeniorCitizen
    {
        return SeniorCitizen::create([
            'osca_id_number' => $oscaId,
            'barangay_id' => $barangay->id,
            'encoded_by' => $encoder->id,
            'first_name' => 'Senior',
            'last_name' => $oscaId,
            'birthdate' => now()->subYears($age)->toDateString(),
            'sex' => 'female',
            'registration_date' => now()->toDateString(),
            'status' => 'active',
        ]);
    }
}
