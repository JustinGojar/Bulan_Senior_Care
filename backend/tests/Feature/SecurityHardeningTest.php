<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_deactivating_a_user_revokes_their_existing_token(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active']);
        $token = $user->createToken('test')->plainTextToken;

        // The token works while the account is active.
        $this->withToken($token)->getJson('/api/user')->assertOk();

        $user->update(['status' => 'inactive']);

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertUnauthorized();

        // The stale token is purged so it cannot be reused.
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);
    }

    public function test_deleting_a_user_revokes_their_existing_token(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active']);
        $token = $user->createToken('test')->plainTextToken;

        $user->delete();

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_profile_photo_rejects_svg_uploads(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'profile_photo' => UploadedFile::fake()->create('evil.svg', 4, 'image/svg+xml'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('profile_photo');
    }

    public function test_leader_registration_cannot_create_a_new_barangay(): void
    {
        $barangay = Barangay::create([
            'barangay_name' => 'Bulusan',
            'municipality' => 'Bulan',
            'province' => 'Sorsogon',
        ]);

        /** @var User $user */
        $user = User::factory()->create([
            'role' => 'leader',
            'status' => 'active',
            'barangay_id' => $barangay->id,
        ]);

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

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/seniors', [
            'privacy_consent' => true,
            'privacy_consent_version' => '2026-10-07',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'birthdate' => '1960-01-01',
            'sex' => 'male',
            'contact_number' => '09123456789',
            'barangay' => 'Fabricated Barangay',
            'benefit' => 'Social Pension',
        ]);

        $response->assertStatus(201);

        // The leader's input barangay is ignored; the record is scoped to their own.
        $this->assertDatabaseMissing('barangays', ['barangay_name' => 'Fabricated Barangay']);
        $this->assertSame($barangay->id, SeniorCitizen::firstOrFail()->barangay_id);
    }

    public function test_forgot_password_endpoint_is_rate_limited(): void
    {
        $statuses = [];
        for ($i = 0; $i < 8; $i++) {
            $statuses[] = $this->postJson('/api/forgot-password', [
                'email' => 'nobody@example.com',
            ])->getStatusCode();
        }

        $this->assertContains(429, $statuses, 'The endpoint should throttle repeated requests.');
    }

    public function test_login_is_rate_limited_per_address_across_accounts(): void
    {
        $statuses = [];
        for ($i = 0; $i < 25; $i++) {
            $statuses[] = $this->postJson('/api/login', [
                'email' => "guess{$i}@example.com",
                'password' => 'wrong-password',
                'accepted_terms' => true,
                'terms_version' => '2026-10-07',
            ])->getStatusCode();
        }

        $this->assertContains(429, $statuses, 'One address should not be able to try unlimited accounts.');
    }

    public function test_api_responses_include_security_headers(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active']);

        $this->withToken($user->createToken('test')->plainTextToken)
            ->getJson('/api/user')
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_idle_token_is_revoked(): void
    {
        config(['sanctum.idle_timeout' => 30]);
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active']);
        $token = $user->createToken('test');
        $token->accessToken->forceFill(['last_used_at' => now()->subMinutes(31)])->save();

        $this->withToken($token->plainTextToken)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_password_change_requires_a_strong_password(): void
    {
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active', 'password' => 'Current#Pass1']);

        $this->withToken($user->createToken('test')->plainTextToken)
            ->postJson('/api/profile/password', [
                'current_password' => 'Current#Pass1',
                'password' => 'weakpassword',
                'password_confirmation' => 'weakpassword',
            ])
            ->assertUnprocessable();
    }

    public function test_admin_setting_a_password_signs_the_user_out(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['status' => 'active', 'role' => 'admin']);
        /** @var User $user */
        $user = User::factory()->create(['status' => 'active', 'role' => 'head']);
        $user->createToken('test');

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->putJson("/api/admin/users/{$user->id}", [
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'head',
                'status' => 'active',
                'password' => 'New#Password1',
                'password_confirmation' => 'New#Password1',
            ])
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
    }
}
