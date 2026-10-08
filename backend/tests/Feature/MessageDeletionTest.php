<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleting_a_conversation_keeps_it_for_the_other_person(): void
    {
        /** @var User $head */
        $head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        /** @var User $leader */
        $leader = User::factory()->create(['role' => 'leader', 'status' => 'active']);
        Message::create(['sender_id' => $leader->id, 'recipient_id' => $head->id, 'subject' => 'Payout', 'message' => 'Unread note']);
        Message::create(['sender_id' => $head->id, 'recipient_id' => $leader->id, 'subject' => 'Payout', 'message' => 'Reply']);

        $this->actingAs($head, 'sanctum')->deleteJson("/api/messages/conversations/{$leader->id}")->assertNoContent();

        $this->actingAs($head, 'sanctum')->getJson('/api/messages')->assertJsonCount(0, 'data');
        $this->actingAs($head, 'sanctum')->getJson('/api/messages/unread-summary')->assertJsonPath('count', 0);
        $this->actingAs($leader, 'sanctum')->getJson('/api/messages')->assertJsonCount(2, 'data');

        // A new message after deleting starts the conversation again for the one who deleted.
        $this->actingAs($leader, 'sanctum')->postJson('/api/messages', [
            'recipient_id' => $head->id, 'subject' => 'Payout', 'message' => 'Are you there?',
        ])->assertCreated();
        $this->actingAs($head, 'sanctum')->getJson('/api/messages')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.message', 'Are you there?');
        $this->assertSame(3, Message::count());
    }
}
