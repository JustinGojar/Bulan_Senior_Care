<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeniorRecordFiltersTest extends TestCase
{
    use RefreshDatabase;

    public function test_senior_search_matches_barangay_and_benefit_filter_matches_assigned_benefit(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $zoneOne = Barangay::create(['barangay_name' => 'Zone 1']);
        $zoneTwo = Barangay::create(['barangay_name' => 'Zone 2']);
        $socialPension = Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'max_age' => null,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);
        $grant = Benefit::create([
            'benefit_name' => 'Octogenarian Grant',
            'benefit_type' => 'octogenarian_grant',
            'min_age' => 80,
            'max_age' => null,
            'amount' => 10000,
            'funding_source' => 'provincial',
            'schedule' => 'one_time',
            'status' => 'active',
        ]);
        $seniorInZoneOne = $this->createSenior($admin, $zoneOne, 'OSCA-ZONE-1', 'Maria', 'Santos');
        $seniorInZoneTwo = $this->createSenior($admin, $zoneTwo, 'OSCA-ZONE-2', 'Juan', 'Reyes');

        BenefitTransaction::create([
            'senior_citizen_id' => $seniorInZoneOne->id,
            'benefit_id' => $grant->id,
            'distributed_by' => $admin->id,
            'amount' => 10000,
            'period_label' => '2026',
            'status' => 'pending',
        ]);
        BenefitTransaction::create([
            'senior_citizen_id' => $seniorInZoneTwo->id,
            'benefit_id' => $socialPension->id,
            'distributed_by' => $admin->id,
            'amount' => 3000,
            'period_label' => '2026-Q1',
            'status' => 'pending',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/seniors?per_page=100&search=Zone%202')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.osca_id_number', 'OSCA-ZONE-2');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/seniors?per_page=100&benefit=Octogenarian%20Grant')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.osca_id_number', 'OSCA-ZONE-1');
    }

    private function createSenior(
        User $encoder,
        Barangay $barangay,
        string $oscaId,
        string $firstName,
        string $lastName,
    ): SeniorCitizen {
        return SeniorCitizen::create([
            'osca_id_number' => $oscaId,
            'barangay_id' => $barangay->id,
            'encoded_by' => $encoder->id,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'birthdate' => now()->subYears(82)->toDateString(),
            'sex' => 'female',
            'registration_date' => now()->toDateString(),
            'status' => 'active',
        ]);
    }
}
