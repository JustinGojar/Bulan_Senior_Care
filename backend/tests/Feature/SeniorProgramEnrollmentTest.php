<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeniorProgramEnrollmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_enrols_the_senior_without_a_payment_record(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Calpi']);
        /** @var User $leader */
        $leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $barangay->id]);
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $pension = Benefit::create([
            'benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60,
            'amount' => 3000, 'funding_source' => 'national', 'schedule' => 'quarterly', 'status' => 'active',
        ]);
        $grant = Benefit::create([
            'benefit_name' => 'Provincial Program', 'benefit_type' => 'provincial', 'min_age' => 60,
            'amount' => 1000, 'funding_source' => 'provincial', 'schedule' => 'quarterly', 'status' => 'active',
        ]);

        $this->actingAs($leader, 'sanctum')->postJson('/api/seniors', [
            'privacy_consent' => true,
            'privacy_consent_version' => '2026-10-07',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'birthdate' => '1960-01-01',
            'sex' => 'male',
            'contact_number' => '09123456789',
            'benefit' => 'Social Pension',
        ])->assertCreated()->assertJsonPath('benefit.benefit_name', 'Social Pension');

        $senior = SeniorCitizen::sole();
        $this->assertSame($pension->id, $senior->benefit_id);
        // Payment records come only from release batches and ATM payrolls.
        $this->assertSame(0, BenefitTransaction::count());

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/seniors/{$senior->osca_id_number}", ['benefit' => 'Provincial Program'])
            ->assertOk()
            ->assertJsonPath('benefit.benefit_name', 'Provincial Program');
        $this->assertSame($grant->id, $senior->fresh()->benefit_id);
    }
}
