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
}
