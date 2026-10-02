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
        /** @var User $leader */
        $leader = User::factory()->create(['role' => 'leader']);
        AuditLog::create([
            'actor_id' => $admin->id,
            'action' => 'created',
            'target_type' => User::class,
            'target_id' => $leader->id,
            'after_value' => ['status' => 'active'],
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'created')
            ->assertJsonPath('data.0.actor.id', $admin->id);

        $this->actingAs($leader, 'sanctum')->getJson('/api/audit-logs')->assertForbidden();
    }

}
