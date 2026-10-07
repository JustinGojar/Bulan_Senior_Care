<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_temporarily_blocked_after_five_failed_attempts(): void
    {
        User::factory()->create([
            'email' => 'staff@example.com',
            'password' => 'StrongPassword123!',
        ]);

        foreach (range(1, 5) as $_) {
            $this->postJson('/api/login', [
                'email' => 'staff@example.com',
                'password' => 'incorrect-password',
                'accepted_terms' => true,
                'terms_version' => '2026-10-07',
            ])->assertStatus(422);
        }

        $this->postJson('/api/login', [
            'email' => 'staff@example.com',
            'password' => 'StrongPassword123!',
            'accepted_terms' => true,
            'terms_version' => '2026-10-07',
        ])->assertStatus(429);
    }
}
