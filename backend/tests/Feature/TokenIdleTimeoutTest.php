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
        /** @var User $user */
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('test')->plainTextToken;
        $user->tokens()->first()->forceFill(['last_used_at' => now()->subMinutes(16)])->save();

        $this->withToken($plainTextToken)
            ->getJson('/api/user')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Your session expired due to inactivity. Please log in again.');

        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_stale_bearer_token_remains_valid_when_idle_timeout_is_off(): void
    {
        config(['sanctum.idle_timeout' => 0]);

        /** @var User $user */
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('test')->plainTextToken;
        $user->tokens()->first()->forceFill(['last_used_at' => now()->subMinutes(121)])->save();

        $this->withToken($plainTextToken)->getJson('/api/user')->assertOk();

        $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_active_bearer_token_remains_valid(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('test')->plainTextToken;
        $user->tokens()->first()->forceFill(['last_used_at' => now()->subMinutes(14)])->save();

        $this->withToken($plainTextToken)->getJson('/api/user')->assertOk();
    }

    public function test_token_past_absolute_expiration_is_rejected(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('test')->plainTextToken;
        $user->tokens()->first()->forceFill([
            'created_at' => now()->subMinutes(721),
            'last_used_at' => now()->subMinute(),
        ])->save();

        $this->withToken($plainTextToken)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_login_reports_session_limits(): void
    {
        User::factory()->create(['email' => 'leader@example.com', 'password' => 'secret-password']);

        $this->postJson('/api/login', ['email' => 'leader@example.com', 'password' => 'secret-password'])
            ->assertOk()
            ->assertJsonPath('session.idle_timeout_minutes', 15)
            ->assertJsonPath('session.expires_in_seconds', 720 * 60);
    }
}
