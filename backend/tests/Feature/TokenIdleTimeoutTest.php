<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenIdleTimeoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_stale_bearer_token_is_revoked(): void
    {
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('test')->plainTextToken;
        $user->tokens()->first()->forceFill(['last_used_at' => now()->subMinutes(121)])->save();

        $this->withToken($plainTextToken)
            ->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Your session expired due to inactivity. Please log in again.');

        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_active_bearer_token_remains_valid(): void
    {
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('test')->plainTextToken;

        $this->withToken($plainTextToken)->getJson('/api/user')->assertOk();
    }
}
