<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    private const LOGIN = ['email' => 'renzo@example.com', 'password' => 'Secret#123'];

    public function test_new_account_must_verify_email_before_logging_in(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'https://seniorcare.example']);
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', $this->account())
            ->assertCreated()
            ->assertJson(['verification_email_sent' => true]);
        $this->app['auth']->forgetGuards();

        $user = User::where('email', 'renzo@example.com')->firstOrFail();
        $this->assertFalse($user->hasVerifiedEmail());
        $url = $this->verificationUrl($user);
        $this->assertStringStartsWith('https://seniorcare.example/verify-email?', $url);

        // Logging in before verifying is refused and sends a fresh link.
        $this->postJson('/api/login', self::LOGIN)
            ->assertStatus(403)
            ->assertJson(['email_unverified' => true]);
        Notification::assertSentToTimes($user, VerifyEmailNotification::class, 2);

        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $this->postJson('/api/verify-email', $query)->assertOk();
        $this->assertTrue($user->fresh()->hasVerifiedEmail());

        $this->postJson('/api/login', self::LOGIN)->assertOk();
    }

    public function test_tampered_or_expired_links_are_rejected(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create(['email' => 'renzo@example.com']);
        $user->sendEmailVerificationNotification();
        parse_str((string) parse_url($this->verificationUrl($user), PHP_URL_QUERY), $query);

        $this->postJson('/api/verify-email', [...$query, 'id' => $user->id + 1])->assertStatus(422);
        $this->postJson('/api/verify-email', [...$query, 'expires' => $query['expires'] + 60])->assertStatus(422);

        $this->travel(25)->hours();
        $this->postJson('/api/verify-email', $query)->assertStatus(422);
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_verification_email_uses_branded_template(): void
    {
        config(['app.frontend_url' => 'https://seniorcare.example']);
        $user = User::factory()->create(['name' => 'Maria Santos']);
        $url = 'https://seniorcare.example/verify-email?id=1&hash=abc&expires=1&signature=def';

        $html = (string) (new VerifyEmailNotification($url))->toMail($user)->render();

        $this->assertStringContainsString('src="https://seniorcare.example/email-logo.png"', $html);
        $this->assertStringContainsString('Verify your email address', $html);
        $this->assertStringContainsString('Hello Maria Santos,', $html);
        $this->assertStringContainsString('href="'.e($url).'"', $html);
        $this->assertStringContainsString('<strong>24 hours</strong>', $html);
    }

    private function verificationUrl(User $user): string
    {
        $url = null;
        Notification::assertSentTo($user, VerifyEmailNotification::class, function ($notification) use ($user, &$url) {
            $url = $notification->toMail($user)->actionUrl;

            return true;
        });

        return $url;
    }

    private function account(): array
    {
        return [
            'first_name' => 'Renzo',
            'last_name' => 'Jaza',
            'email' => 'renzo@example.com',
            'contact_number' => '09171234567',
            'birthdate' => '1990-01-01',
            'role' => 'head',
            'status' => 'active',
            'password' => 'Secret#123',
            'password_confirmation' => 'Secret#123',
        ];
    }
}
