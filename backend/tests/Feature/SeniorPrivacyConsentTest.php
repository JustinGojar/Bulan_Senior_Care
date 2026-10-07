<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Benefit;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SeniorPrivacyConsentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'max_age' => null,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'description' => 'Social pension',
            'status' => 'active',
        ]);
    }

    private function register(array $overrides = [])
    {
        return $this->actingAs($this->admin, 'sanctum')->postJson('/api/seniors', array_merge([
            'privacy_consent' => true,
            'privacy_consent_version' => '2026-10-07',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'birthdate' => '1960-01-01',
            'sex' => 'male',
            'contact_number' => '09123456789',
            'barangay' => 'Bulusan',
            'benefit' => 'Social Pension',
        ], $overrides));
    }

    public function test_registration_is_refused_without_privacy_consent(): void
    {
        $this->register(['privacy_consent' => false])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'privacy_consent' => 'The senior must agree to the Data Privacy Consent before registering.',
            ]);
        $this->register(['privacy_consent' => null])->assertStatus(422)->assertJsonValidationErrors('privacy_consent');
        $this->register(['privacy_consent_version' => null])->assertStatus(422)->assertJsonValidationErrors('privacy_consent_version');

        $this->assertSame(0, SeniorCitizen::count());
    }

    public function test_registration_records_the_consent_version_and_time(): void
    {
        Carbon::setTestNow('2026-10-07 10:15:00');

        $this->register()
            ->assertStatus(201)
            ->assertJsonPath('privacy_consent_version', '2026-10-07');

        $senior = SeniorCitizen::sole();
        $this->assertSame('2026-10-07', $senior->privacy_consent_version);
        $this->assertTrue($senior->privacy_consent_at->equalTo(Carbon::parse('2026-10-07 10:15:00')));
        $this->assertSame($this->admin->id, $senior->encoded_by);

        $log = AuditLog::where('action', 'created')->sole();
        $this->assertSame('2026-10-07', $log->after_value['privacy_consent_version']);
    }

    public function test_updating_a_senior_does_not_require_consent_again(): void
    {
        $this->register()->assertStatus(201);
        $senior = SeniorCitizen::sole();

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/seniors/{$senior->osca_id_number}", ['place_of_birth' => 'Bulan, Sorsogon'])
            ->assertOk();

        $this->assertSame('2026-10-07', $senior->fresh()->privacy_consent_version);
    }
}
