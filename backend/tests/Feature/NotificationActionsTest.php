<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationActionsTest extends TestCase
{
    use RefreshDatabase;

    private function notificationFor(User $user, string $status = 'read'): Notification
    {
        return Notification::create([
            'recipient_account_id' => $user->id,
            'message' => 'Test notification',
            'channel' => 'in_app',
            'status' => $status,
        ]);
    }

    public function test_user_can_mark_a_notification_unread(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $notification = $this->notificationFor($user);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/notifications/{$notification->id}/unread")
            ->assertOk()
            ->assertJsonPath('status', 'unread');
    }

    public function test_archived_notifications_do_not_count_as_unread(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $notification = $this->notificationFor($user, 'unread');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/notifications/{$notification->id}/archive")
            ->assertOk()
            ->assertJsonPath('id', $notification->id);
        $this->assertNotNull($notification->fresh()->archived_at);

        $this->getJson('/api/notifications/unread-count')->assertExactJson(['count' => 0]);

        $this->postJson("/api/notifications/{$notification->id}/unarchive")->assertOk();
        $this->assertNull($notification->fresh()->archived_at);
        $this->getJson('/api/notifications/unread-count')->assertExactJson(['count' => 1]);
    }

    public function test_user_cannot_change_another_users_notification(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var User $otherUser */
        $otherUser = User::factory()->create();
        $notification = $this->notificationFor($otherUser);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/notifications/{$notification->id}/archive")
            ->assertForbidden();
        $this->postJson("/api/notifications/{$notification->id}/unread")->assertForbidden();
    }
}
