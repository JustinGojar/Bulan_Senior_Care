<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Admin test cases with tester comments: ADM-008, ADM-010, ADM-014. */
class AdminTestCaseFixesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $head;
    private User $leader;

    protected function setUp(): void
    {
        parent::setUp();
        $barangay = Barangay::create(['barangay_name' => 'Zone 1', 'municipality' => 'Bulan', 'province' => 'Sorsogon']);
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->head = User::factory()->create(['role' => 'head', 'status' => 'active', 'email' => 'head@example.com', 'password' => 'StrongPassword123!']);
        $this->leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $barangay->id]);
    }

    /** ADM-008 */
    public function test_admin_deactivates_and_reactivates_a_user(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/users/{$this->head->id}/status", ['status' => 'inactive'])
            ->assertOk()->assertJsonPath('status', 'inactive');
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['email' => 'head@example.com', 'password' => 'StrongPassword123!'])
            ->assertStatus(403)->assertJsonPath('message', 'Account is inactive. Please contact the OSCA administrator.');
        // A wrong password gets the usual message, so the account's status is not revealed.
        $this->postJson('/api/login', ['email' => 'head@example.com', 'password' => 'wrong-password'])
            ->assertStatus(422)->assertJsonPath('message', 'The provided credentials are incorrect.');

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/users/{$this->head->id}/status", ['status' => 'active'])
            ->assertOk()->assertJsonPath('status', 'active');
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['email' => 'head@example.com', 'password' => 'StrongPassword123!'])->assertOk();
        $this->assertSame(2, AuditLog::whereIn('action', ['deactivated', 'activated'])->count());
    }

    public function test_admin_cannot_deactivate_their_own_account_and_others_cannot_deactivate(): void
    {
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/users/{$this->admin->id}/status", ['status' => 'inactive'])->assertStatus(422);
        $this->actingAs($this->head, 'sanctum')->postJson("/api/admin/users/{$this->leader->id}/status", ['status' => 'inactive'])->assertForbidden();
    }

    /** ADM-010 */
    public function test_admin_removes_a_permission_from_the_head(): void
    {
        $this->actingAs($this->head, 'sanctum')->getJson('/api/user')
            ->assertJsonPath('granted_permissions', fn (array $granted) => in_array('export reports', $granted, true));

        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/role-permissions')
            ->assertOk()->assertJsonPath('roles.head', fn (array $granted) => in_array('manage announcements', $granted, true));
        $this->putJson('/api/admin/role-permissions/head', ['permissions' => ['approve registrations', 'manage benefit requests', 'schedule benefit releases']])
            ->assertOk()->assertJsonPath('roles.head', ['approve registrations', 'manage benefit requests', 'schedule benefit releases']);

        $this->actingAs($this->head, 'sanctum')->getJson('/api/user')
            ->assertJsonPath('granted_permissions', fn (array $granted) => ! in_array('export reports', $granted, true));
        $this->postJson('/api/announcements', ['title' => 'Payout', 'message' => 'Details'])
            ->assertForbidden()->assertJsonPath('message', fn (string $message) => str_contains($message, 'permission'));
    }

    public function test_only_admin_manages_permissions_and_only_for_head_and_leader(): void
    {
        $this->actingAs($this->head, 'sanctum')->getJson('/api/admin/role-permissions')->assertForbidden();
        $this->actingAs($this->admin, 'sanctum')->putJson('/api/admin/role-permissions/admin', ['permissions' => []])->assertNotFound();
        // A permission that does not apply to the role is ignored.
        $this->putJson('/api/admin/role-permissions/leader', ['permissions' => ['request benefits', 'manage announcements']])
            ->assertOk()->assertJsonPath('roles.leader', ['request benefits']);
    }

    /** ADM-014 */
    public function test_audit_logs_filter_by_user_and_date(): void
    {
        AuditLog::record($this->head, 'created', $this->leader);
        $this->travel(-10)->days();
        AuditLog::record($this->leader, 'updated', $this->leader);
        $this->travelBack();

        $this->actingAs($this->admin, 'sanctum')->getJson("/api/audit-logs?user_id={$this->head->id}")
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.actor.id', $this->head->id);
        $this->getJson('/api/audit-logs?date_from='.now()->subDays(11)->toDateString().'&date_to='.now()->subDays(9)->toDateString())
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.actor.id', $this->leader->id);
        $this->getJson('/api/audit-logs?date_from=2026-10-10&date_to=2026-10-01')->assertStatus(422);
    }
}
