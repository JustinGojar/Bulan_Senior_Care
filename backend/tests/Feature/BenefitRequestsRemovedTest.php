<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use App\Support\RolePermissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BenefitRequestsRemovedTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_endpoints_are_unavailable_for_every_role(): void
    {
        foreach (['president', 'head', 'admin'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $this->actingAs($user, 'sanctum');
            $this->getJson('/api/benefit-requests')->assertNotFound();
            $this->postJson('/api/benefit-requests', [])->assertNotFound();
            $this->patchJson('/api/benefit-requests/1', ['action' => 'release'])->assertNotFound();
            $this->assertNotContains('request benefits', RolePermissions::granted($role));
            $this->assertNotContains('manage benefit requests', RolePermissions::granted($role));
        }
        $this->assertArrayNotHasKey('request benefits', RolePermissions::PERMISSIONS);
        $this->assertArrayNotHasKey('manage benefit requests', RolePermissions::PERMISSIONS);
    }

    public function test_old_request_notifications_are_hidden_without_deleting_history(): void
    {
        foreach (['president', 'head', 'admin'] as $role) {
            $user = User::factory()->create(['role' => $role, 'status' => 'active']);
            $attributes = [
                'recipient_account_id' => $user->id,
                'message' => 'Historical notification',
                'channel' => 'in_app',
                'date_sent' => now(),
                'status' => 'unread',
            ];
            $retired = Notification::create([...$attributes, 'source_type' => 'benefit_request']);
            $visible = Notification::create($attributes);
            $this->actingAs($user, 'sanctum')->getJson('/api/notifications')
                ->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $visible->id);
            $this->getJson('/api/notifications/unread-count')->assertOk()->assertJsonPath('count', 1);
            $this->assertDatabaseHas('notifications', ['id' => $retired->id]);
        }
    }
}
