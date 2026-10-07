<?php

namespace Tests\Feature;

use App\Http\Middleware\AuthenticateFromCookie;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CookieAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function login()
    {
        User::factory()->create([
            'email' => 'staff@example.com',
            'password' => 'StrongPassword123!',
        ]);

        return $this->postJson('/api/login', [
            'email' => 'staff@example.com',
            'password' => 'StrongPassword123!',
            'accepted_terms' => true,
            'terms_version' => '2026-10-07',
        ]);
    }

    public function test_login_sets_the_token_in_an_http_only_cookie_and_not_the_body(): void
    {
        $response = $this->login()->assertOk()->assertJsonMissingPath('token');

        $cookie = $response->getCookie(AuthenticateFromCookie::COOKIE, false);
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('strict', $cookie->getSameSite());
        $this->assertSame('/api', $cookie->getPath());
        $this->assertStringNotContainsString($cookie->getValue(), $response->getContent());
    }

    public function test_cookie_authenticates_portal_requests(): void
    {
        $token = $this->login()->getCookie(AuthenticateFromCookie::COOKIE, false)->getValue();

        $this->withCredentials()
            ->withUnencryptedCookie(AuthenticateFromCookie::COOKIE, $token)
            ->withHeader('X-Requested-With', 'XMLHttpRequest')
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', 'staff@example.com');
    }

    public function test_cookie_is_ignored_without_the_portal_header(): void
    {
        $token = $this->login()->getCookie(AuthenticateFromCookie::COOKIE, false)->getValue();

        $this->withCredentials()
            ->withUnencryptedCookie(AuthenticateFromCookie::COOKIE, $token)
            ->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_logout_revokes_the_token_and_clears_the_cookie(): void
    {
        $token = $this->login()->getCookie(AuthenticateFromCookie::COOKIE, false)->getValue();

        $cookie = $this->withCredentials()
            ->withUnencryptedCookie(AuthenticateFromCookie::COOKIE, $token)
            ->withHeader('X-Requested-With', 'XMLHttpRequest')
            ->postJson('/api/logout')
            ->assertOk()
            ->getCookie(AuthenticateFromCookie::COOKIE, false);

        $this->assertTrue($cookie->isCleared());
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
