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
        BenefitTransaction::create([
            'senior_citizen_id' => $localSenior->id,
            'benefit_id' => $benefit->id,
            'distributed_by' => $leader->id,
            'amount' => 3000,
            'status' => 'released',
        ]);
        BenefitTransaction::create([
            'senior_citizen_id' => $localSenior->id,
            'benefit_id' => $benefit->id,
            'distributed_by' => $leader->id,
            'amount' => 3000,
            'status' => 'pending',
        ]);

        $this->actingAs($leader, 'sanctum')
            ->getJson('/api/analytics?barangay_id='.$otherBarangay->id)
            ->assertOk()
            ->assertJsonPath('municipal.total_registered', 1)
            ->assertJsonPath('barangay_summary.0.barangay', 'Zone 1')
            ->assertJsonPath('barangay_summary.0.registered', 1)
            ->assertJsonPath('barangay_summary.0.released', 2)
            ->assertJsonPath('age_distribution.1.count', 1)
            ->assertJsonPath('age_distribution.4.count', 0)
            // Benefit records count seniors by age rule, not transactions.
            ->assertJsonPath('benefit_records.0.name', 'Social Pension')
            ->assertJsonPath('benefit_records.0.value', 1)
            ->assertJsonCount(1, 'benefit_records')
            ->assertJsonPath('released_benefit_records.0.name', 'Social Pension')
            ->assertJsonPath('released_benefit_records.0.senior_count', 1)
            ->assertJsonPath('benefit_status_records.0.name', 'Social Pension')
            ->assertJsonPath('benefit_status_records.0.released', 2)
            ->assertJsonPath('benefit_status_records.0.pending', 1)
            ->assertJsonPath('benefit_status_records.0.not_released', 0);
    }

    public function test_age_brackets_use_exact_birthdays_and_skip_pending_and_archived_seniors(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        $this->createSenior($admin, $barangay, 'TURNS-70-TODAY', 70);
        $this->createSenior($admin, $barangay, 'TURNS-80-TOMORROW', 80, now()->subYears(80)->addDay());
        $this->createSenior($admin, $barangay, 'TURNS-100-TODAY', 100);
        $this->createSenior($admin, $barangay, 'PENDING', 85, status: 'pending');
        $this->createSenior($admin, $barangay, 'ARCHIVED', 85)->delete();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/analytics')
            ->assertOk()
            ->assertJsonPath('municipal.total_registered', 3)
            ->assertJsonPath('age_distribution.0.count', 0)
            ->assertJsonPath('age_distribution.1.count', 2)
            ->assertJsonPath('age_distribution.2.count', 0)
            ->assertJsonPath('age_distribution.4.count', 1)
            ->assertJsonPath('barangay_summary.0.registered', 3)
            ->assertJsonPath('trend.0.municipal', 3);
    }

    public function test_benefit_records_follow_the_expanded_centenarian_age_bands(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 8 (Loyo)']);
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        // Social Pension: 79, 86 (between bands), 96 and 101.
        foreach ([79, 86, 96, 101] as $age) {
            $this->createSenior($admin, $barangay, "SP-{$age}", $age);
        }
        // Turns 80 tomorrow, so still 79 today.
        $this->createSenior($admin, $barangay, 'SP-80-TOMORROW', 80, now()->subYears(80)->addDay());
        $this->createSenior($admin, $barangay, 'OCTO-80', 80);
        $this->createSenior($admin, $barangay, 'OCTO-85', 85);
        $this->createSenior($admin, $barangay, 'NONA-90', 90);
        $this->createSenior($admin, $barangay, 'NONA-95', 95);
        $this->createSenior($admin, $barangay, 'CENT-100', 100);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/analytics')
            ->assertOk()
            ->assertJsonPath('benefit_records', [
                ['name' => 'Social Pension', 'value' => 5],
                ['name' => 'Octogenarian Grant', 'value' => 2],
                ['name' => 'Nonagenarian Grant', 'value' => 2],
                ['name' => 'Centenarian Award', 'value' => 1],
            ]);
    }

    private function createSenior(
        User $encoder,
        Barangay $barangay,
        string $oscaId,
        int $age,
        $birthdate = null,
        string $status = 'active',
    ): SeniorCitizen {
        return SeniorCitizen::create([
            'osca_id_number' => $oscaId,
            'barangay_id' => $barangay->id,
            'encoded_by' => $encoder->id,
            'first_name' => 'Senior',
            'last_name' => $oscaId,
            'birthdate' => ($birthdate ?? now()->subYears($age))->toDateString(),
            'sex' => 'female',
            'registration_date' => now()->toDateString(),
            'status' => $status,
        ]);
    }
}
