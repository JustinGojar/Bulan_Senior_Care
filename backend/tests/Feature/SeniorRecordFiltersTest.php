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
        $seniorInZoneOne->update(['benefit_id' => $grant->id]);
        $seniorInZoneTwo->update(['benefit_id' => $socialPension->id]);

        // A payment record for another program does not change the program the senior is enrolled in.
        BenefitTransaction::create([
            'senior_citizen_id' => $seniorInZoneTwo->id,
            'benefit_id' => $grant->id,
            'distributed_by' => $admin->id,
            'amount' => 10000,
            'period_label' => '2026',
            'status' => 'released',
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

    public function test_senior_search_finds_a_full_name(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $zone = Barangay::create(['barangay_name' => 'Zone 1']);
        $this->createSenior($admin, $zone, 'OSCA-1', 'Juan', 'Dela Cruz');
        $this->createSenior($admin, $zone, 'OSCA-2', 'Juan', 'Reyes');
        $this->createSenior($admin, $zone, 'OSCA-3', 'Maria', 'Dela Cruz');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/seniors?per_page=100&search='.urlencode('Juan Dela Cruz'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.osca_id_number', 'OSCA-1');
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
