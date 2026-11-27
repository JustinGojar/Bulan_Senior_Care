<?php

namespace Tests\Feature;

use App\Http\Middleware\AuthenticateFromCookie;
use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\SeniorCitizen;
use App\Models\User;
use App\Support\RolePermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_cross_site_login_is_rejected_before_setting_a_cookie(): void
    {
        $this->withHeaders(['Origin' => 'https://attacker.example', 'Sec-Fetch-Site' => 'cross-site'])
            ->postJson('/api/login', [])
            ->assertForbidden()->assertCookieMissing(AuthenticateFromCookie::COOKIE)
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_same_origin_login_still_accepts_valid_credentials_and_rehashes_old_passwords(): void
    {
        $user = User::factory()->create(['password' => 'ValidPassword123!']);
        $oldHash = $user->password;
        Hash::driver()->setRounds(5);
        $response = $this->withHeader('Origin', 'http://localhost')->postJson('/api/login', [
            'email' => $user->email, 'password' => 'ValidPassword123!',
        ])->assertOk();
        $this->assertNotSame($oldHash, $user->fresh()->password);
        $this->assertTrue(Hash::check('ValidPassword123!', $user->fresh()->password));
        $this->assertFalse(Hash::needsRehash($user->fresh()->password));
        $response->assertJsonMissingPath('user.password')->assertJsonMissingPath('token');
    }

    public function test_production_cookie_is_secure_even_when_tls_terminates_upstream(): void
    {
        $this->app['env'] = 'production';
        $cookie = AuthenticateFromCookie::issue(\Illuminate\Http\Request::create('http://localhost/api/login'), 'example');
        $this->assertTrue($cookie->isSecure());
        $this->assertTrue($cookie->isHttpOnly());
    }

    public function test_temporary_password_cannot_download_private_files(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'must_change_password' => true]);
        $senior = $this->senior();
        $this->withToken($user->createToken('test')->plainTextToken)
            ->getJson("/api/seniors/{$senior->osca_id_number}/files/photo")->assertStatus(423);
    }

    public function test_delegated_user_permissions_do_not_allow_admin_takeover_or_deletion(): void
    {
        RolePermissions::syncSystem('head', ['users.reset-password', 'users.deactivate']);
        $head = User::factory()->create(['role' => 'head']);
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'admin']);
        $hash = $admin->password;
        $this->actingAs($head, 'sanctum')->postJson("/api/admin/users/{$admin->id}/reset-password")->assertForbidden();
        $this->deleteJson("/api/admin/users/{$admin->id}")->assertForbidden();
        $this->assertSame($hash, $admin->fresh()->password);
        $this->assertNotSoftDeleted($admin);
    }

    public function test_delegated_delete_permission_does_not_cross_barangay_boundaries(): void
    {
        RolePermissions::syncSystem('president', ['seniors.delete']);
        $president = User::factory()->create(['role' => 'president', 'barangay_id' => Barangay::create(['barangay_name' => 'Own zone'])->id]);
        $senior = $this->senior();
        $this->actingAs($president, 'sanctum')->deleteJson("/api/seniors/{$senior->osca_id_number}")->assertForbidden();
        $this->assertNotSoftDeleted($senior);
    }

    public function test_password_changes_are_rate_limited_per_user(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/profile/password', [])->assertUnprocessable();
        }
        $this->postJson('/api/profile/password', [])->assertTooManyRequests();
    }

    public function test_profile_cannot_mass_assign_privileged_fields(): void
    {
        $user = User::factory()->create(['role' => 'viewer']);
        $this->actingAs($user, 'sanctum')->postJson('/api/profile', [
            'name' => 'Updated Name', 'email' => $user->email,
            'role' => 'admin', 'status' => 'inactive', 'password' => 'Injected123!',
        ])->assertOk();
        $this->assertSame('viewer', $user->fresh()->role);
        $this->assertSame('active', $user->fresh()->status);
        $this->assertFalse(Hash::check('Injected123!', $user->fresh()->password));
    }

    public function test_multibyte_passwords_cannot_exceed_bcrypt_byte_limit(): void
    {
        $user = User::factory()->create(['password' => 'Current123!']);
        $password = str_repeat('é', 36).'Aa1!';
        $this->actingAs($user, 'sanctum')->postJson('/api/profile/password', [
            'current_password' => 'Current123!', 'password' => $password, 'password_confirmation' => $password,
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_untrusted_forwarded_ip_cannot_evade_login_rate_limits(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.1'])
                ->withHeader('X-Forwarded-For', "198.51.100.{$i}")->postJson('/api/login', [])->assertUnprocessable();
        }
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.1'])
            ->withHeader('X-Forwarded-For', '198.51.100.99')->postJson('/api/login', [])->assertTooManyRequests();
    }

    private function senior(): SeniorCitizen
    {
        $barangay = Barangay::create(['barangay_name' => 'Other zone']);
        $benefit = Benefit::create(['benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60, 'amount' => 1000, 'funding_source' => 'national', 'schedule' => 'quarterly', 'status' => 'active']);

        return SeniorCitizen::create(['osca_id_number' => 'SEC-001', 'first_name' => 'Test', 'last_name' => 'Senior', 'birthdate' => '1950-01-01', 'sex' => 'male', 'barangay_id' => $barangay->id, 'benefit_id' => $benefit->id, 'encoded_by' => User::factory()->create()->id, 'registration_date' => '2026-11-27', 'status' => 'active']);
    }
}
