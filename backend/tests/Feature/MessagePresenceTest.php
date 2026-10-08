<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessagePresenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_accounts_active_in_the_last_two_minutes_are_online(): void
    {
        /** @var User $me */
        $me = User::factory()->create(['role' => 'head', 'status' => 'active']);
        $active = User::factory()->create(['role' => 'leader', 'status' => 'active']);
        $idle = User::factory()->create(['role' => 'leader', 'status' => 'active']);
        $signedOut = User::factory()->create(['role' => 'leader', 'status' => 'active']);

        $active->createToken('portal')->accessToken->forceFill(['last_used_at' => now()->subSeconds(30)])->save();
        $idle->createToken('portal')->accessToken->forceFill(['last_used_at' => now()->subMinutes(5)])->save();

        foreach ([$active, $idle, $signedOut] as $partner) {
            Message::create(['sender_id' => $partner->id, 'recipient_id' => $me->id, 'subject' => 'Hi', 'message' => 'Hello']);
        }

        $this->actingAs($me, 'sanctum')->getJson('/api/messages')
            ->assertOk()
            ->assertJsonPath('online_user_ids', [$active->id]);

        $this->actingAs($me, 'sanctum')
            ->getJson('/api/messages/presence?'.http_build_query(['ids' => [$active->id, $idle->id, $signedOut->id]]))
            ->assertOk()
            ->assertJsonPath('online_user_ids', [$active->id]);
    }
}
