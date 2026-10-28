<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessageReadTest extends TestCase
{
    use RefreshDatabase;

    public function test_opening_a_conversation_marks_every_received_message_read(): void
    {
        /** @var User $head */
        $head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        /** @var User $president */
        $president = User::factory()->create(['role' => 'president', 'status' => 'active']);
        Message::create(['sender_id' => $president->id, 'recipient_id' => $head->id, 'subject' => 'Payout', 'message' => 'First']);
        Message::create(['sender_id' => $president->id, 'recipient_id' => $head->id, 'subject' => 'Payout', 'message' => 'Second']);
        $sent = Message::create(['sender_id' => $head->id, 'recipient_id' => $president->id, 'subject' => 'Payout', 'message' => 'Reply']);

        $this->actingAs($head, 'sanctum')->getJson('/api/messages/unread-summary')->assertJsonPath('count', 1);

        $this->actingAs($head, 'sanctum')->postJson("/api/messages/conversations/{$president->id}/read")
            ->assertOk()
            ->assertJsonPath('updated', 2);

        $this->actingAs($head, 'sanctum')->getJson('/api/messages/unread-summary')->assertJsonPath('count', 0);
        // The president's own unread copy of the reply is untouched.
        $this->assertNull($sent->fresh()->read_at);
    }
}
