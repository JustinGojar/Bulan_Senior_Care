<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenIdleTimeoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_stale_bearer_token_remains_valid_by_default(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('test')->plainTextToken;
        $user->tokens()->first()->forceFill(['last_used_at' => now()->subMinutes(121)])->save();

        $this->withToken($plainTextToken)
            ->getJson('/api/user')
            ->assertOk();

        $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_active_bearer_token_remains_valid(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('test')->plainTextToken;

        $this->withToken($plainTextToken)->getJson('/api/user')->assertOk();
    }
}
