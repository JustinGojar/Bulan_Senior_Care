<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\SeniorCitizen;
use App\Models\User;
use App\Support\RolePermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SystemRoleManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_encoder_cannot_view_or_manage_user_accounts(): void
    {
        $encoder = User::factory()->create(['role' => 'encoder']);
        $encoder->syncRoles([Role::findByName('encoder', 'web')]);
        $target = User::factory()->create(['role' => 'viewer']);

        $this->actingAs($encoder, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();

        $this->actingAs($encoder, 'sanctum')
            ->putJson("/api/admin/users/{$target->id}", [
                'name' => $target->name,
                'email' => $target->email,
                'role' => 'viewer',
                'status' => 'active',
            ])
            ->assertForbidden();

        $this->actingAs($encoder, 'sanctum')
            ->deleteJson("/api/admin/users/{$target->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    public function test_system_permission_updates_preserve_legacy_role_permissions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $headRole = Role::findByName('head', 'web');

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/roles/permissions', [
                'roles' => ['head' => ['seniors.view', 'audit-logs.view']],
            ])
            ->assertOk()
            ->assertJsonPath('roles.head.permissions', ['seniors.view', 'audit-logs.view']);

        $headRole->refresh();
        $this->assertTrue($headRole->hasPermissionTo('export reports', 'web'));
        $this->assertTrue($headRole->hasPermissionTo('seniors.view', 'web'));
        $this->assertFalse($headRole->hasPermissionTo('seniors.delete', 'web'));
    }

    public function test_audit_and_barangay_read_access_use_system_permissions(): void
    {
        $head = User::factory()->create(['role' => 'head']);
        $head->syncRoles([Role::findByName('head', 'web')]);
        RolePermissions::syncSystem('head', ['audit-logs.view']);

        $this->actingAs($head, 'sanctum')->getJson('/api/audit-logs')->assertOk();
        $this->actingAs($head, 'sanctum')->getJson('/api/barangays')->assertForbidden();

        RolePermissions::syncSystem('head', []);
        $this->actingAs($head, 'sanctum')->getJson('/api/audit-logs')->assertForbidden();
    }

    public function test_temporary_password_requires_change_before_using_the_api(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $viewer = User::factory()->create(['role' => 'viewer']);
        $viewer->syncRoles([Role::findByName('viewer', 'web')]);
        $oldToken = $viewer->createToken('old-session');
        $adminToken = $admin->createToken('admin-session')->plainTextToken;

        $response = $this->withToken($adminToken)
            ->postJson("/api/admin/users/{$viewer->id}/reset-password")
            ->assertOk()
            ->assertJsonStructure(['message', 'temporary_password']);

        $temporaryPassword = $response->json('temporary_password');
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $oldToken->accessToken->id]);
        $this->assertTrue($viewer->fresh()->must_change_password);

        $token = $viewer->fresh()->createToken('new-session')->plainTextToken;
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/seniors')->assertStatus(423);
        $this->withToken($token)->postJson('/api/profile/password', [
            'current_password' => $temporaryPassword,
            'password' => 'NewSecurePass123!',
            'password_confirmation' => 'NewSecurePass123!',
        ])->assertOk();

        $this->assertFalse($viewer->fresh()->must_change_password);
        $this->withToken($token)->getJson('/api/seniors')->assertOk();
    }

    public function test_last_active_super_admin_cannot_be_deactivated_or_deleted(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/users/{$admin->id}/status", ['status' => 'inactive'])
            ->assertUnprocessable();
        $this->assertSame('active', $admin->fresh()->status);

        $otherAdmin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/users/{$admin->id}")
            ->assertUnprocessable();

        $otherAdmin->forceDelete();
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'status' => 'active']);
    }

    public function test_encoder_role_receives_default_senior_permissions(): void
    {
        $encoder = User::factory()->create(['role' => 'encoder']);
        $encoder->syncRoles([Role::findByName('encoder', 'web')]);

        $this->assertTrue($encoder->hasPermissionTo('seniors.view', 'web'));
        $this->assertTrue($encoder->hasPermissionTo('seniors.create', 'web'));
        $this->assertTrue($encoder->hasPermissionTo('seniors.update', 'web'));
        $this->assertFalse($encoder->hasPermissionTo('seniors.delete', 'web'));
        $this->assertFalse($encoder->hasPermissionTo('users.view', 'web'));
    }

    public function test_encoder_cannot_delete_a_senior_record(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        $benefit = Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);
        $encoder = User::factory()->create(['role' => 'encoder']);
        $senior = SeniorCitizen::create([
            'osca_id_number' => 'BSC-2026-0099',
            'barangay_id' => $barangay->id,
            'benefit_id' => $benefit->id,
            'encoded_by' => $encoder->id,
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'birthdate' => '1940-01-01',
            'sex' => 'male',
            'registration_date' => '2026-01-01',
            'status' => 'active',
        ]);

        $this->actingAs($encoder, 'sanctum')
            ->deleteJson("/api/seniors/{$senior->osca_id_number}")
            ->assertForbidden();

        $this->assertNotSoftDeleted($senior);
    }
}
