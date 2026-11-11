<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemDataToolsTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_logs_are_available_only_to_administrators(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin']);
        /** @var User $president */
        $president = User::factory()->create(['role' => 'president']);
        AuditLog::create([
            'actor_id' => $admin->id,
            'action' => 'created',
            'target_type' => User::class,
            'target_id' => $president->id,
            'after_value' => ['status' => 'active'],
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'created')
            ->assertJsonPath('data.0.actor.id', $admin->id);

        $this->actingAs($president, 'sanctum')->getJson('/api/audit-logs')->assertForbidden();
    }

    public function test_audit_log_end_date_can_be_used_without_a_start_date(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $log = AuditLog::create([
            'actor_id' => $admin->id, 'action' => 'created', 'target_type' => User::class,
            'target_id' => $admin->id,
        ]);
        $log->forceFill(['created_at' => '2026-01-15 12:00:00'])->save();

        $this->actingAs($admin, 'sanctum')->getJson('/api/audit-logs?date_to=2026-01-31')
            ->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/audit-logs?date_to=2026-01-01')
            ->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/audit-logs?date_from=2026-02-01&date_to=2026-01-31')
            ->assertUnprocessable()->assertJsonValidationErrors('date_to');
    }
}
