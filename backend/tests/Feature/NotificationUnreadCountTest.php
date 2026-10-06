<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationUnreadCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_unread_count_only_includes_the_authenticated_users_unread_notifications(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        /** @var User $otherUser */
        $otherUser = User::factory()->create();

        Notification::create([
            'recipient_account_id' => $user->id,
            'message' => 'Unread notification',
            'channel' => 'in_app',
            'status' => 'unread',
        ]);
        Notification::create([
            'recipient_account_id' => $user->id,
            'message' => 'Read notification',
            'channel' => 'in_app',
            'status' => 'read',
        ]);
        Notification::create([
            'recipient_account_id' => $otherUser->id,
            'message' => 'Another users unread notification',
            'channel' => 'in_app',
            'status' => 'unread',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertExactJson(['count' => 1]);
    }

    public function test_unread_count_requires_authentication(): void
    {
        $this->getJson('/api/notifications/unread-count')->assertUnauthorized();
    }
}
