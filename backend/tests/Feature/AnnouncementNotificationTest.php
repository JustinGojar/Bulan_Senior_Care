<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnouncementNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_publishing_an_announcement_notifies_all_active_barangay_presidents(): void
    {
        /** @var User $head */
        $head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        /** @var User $activePresident */
        $activePresident = User::factory()->create(['role' => 'president', 'status' => 'active']);
        /** @var User $inactivePresident */
        $inactivePresident = User::factory()->create(['role' => 'president', 'status' => 'inactive']);
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $response = $this->actingAs($head, 'sanctum')->postJson('/api/announcements', [
            'title' => 'Community meeting',
            'message' => 'The next meeting is on Friday.',
        ]);

        $response->assertCreated();
        $announcementId = $response->json('id');

        $this->assertDatabaseHas('notifications', [
            'sender_account_id' => $head->id,
            'recipient_account_id' => $activePresident->id,
            'message' => 'New announcement: Community meeting',
            'source_type' => 'announcement',
            'source_id' => $announcementId,
            'channel' => 'in_app',
            'status' => 'unread',
        ]);
        $this->assertDatabaseMissing('notifications', ['recipient_account_id' => $inactivePresident->id]);
        $this->assertDatabaseMissing('notifications', ['recipient_account_id' => $admin->id]);
    }
}
