<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_reset_password_with_the_emailed_link(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'https://seniorcare.example']);
        $user = User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);

        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertOk();

        $url = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use ($user, &$url) {
            $url = $notification->toMail($user)->actionUrl;

            return true;
        });
        $this->assertStringStartsWith('https://seniorcare.example/reset-password?token=', $url);
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $this->assertSame('leader@example.com', $query['email']);

        $this->postJson('/api/reset-password', [
            'token' => $query['token'],
            'email' => $query['email'],
            'password' => 'NewPass#2026',
            'password_confirmation' => 'NewPass#2026',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewPass#2026', $user->fresh()->password));
        $this->postJson('/api/login', ['email' => 'leader@example.com', 'password' => 'NewPass#2026', 'accepted_terms' => true, 'terms_version' => '2026-10-07'])->assertOk();

        // A used link cannot be reused.
        $this->postJson('/api/reset-password', [
            'token' => $query['token'],
            'email' => $query['email'],
            'password' => 'Another#2026',
            'password_confirmation' => 'Another#2026',
        ])->assertStatus(422);
    }

    public function test_unknown_email_gets_the_same_response(): void
    {
        $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])
            ->assertOk()
            ->assertJson(['message' => 'If an account exists for that email address, a password reset link has been sent.']);
    }

    public function test_failed_email_send_can_be_retried_immediately(): void
    {
        User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);
        // Nothing listens on port 1, so the SMTP connection is refused.
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => '127.0.0.1',
            'mail.mailers.smtp.port' => 1,
        ]);

        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertStatus(503);
        $this->assertSame(0, DB::table('password_reset_tokens')->count());

        // Once mail works again, the retry sends a link instead of being throttled.
        Notification::fake();
        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertOk();
        Notification::assertSentTo(User::where('email', 'leader@example.com')->first(), ResetPasswordNotification::class);
    }

    public function test_reset_email_is_sent_through_the_brevo_api(): void
    {
        config([
            'mail.default' => 'brevo',
            'services.brevo.key' => 'test-key',
            'mail.from.address' => 'office@example.com',
            'mail.from.name' => 'Bulan SeniorCare',
            'app.frontend_url' => 'https://seniorcare.example',
        ]);
        Http::fake(['api.brevo.com/*' => Http::response(['messageId' => '<abc@brevo>'], 201)]);
        User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);

        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertOk();

        Http::assertSent(fn (Request $request) => $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request->hasHeader('api-key', 'test-key')
            && $request['sender']['email'] === 'office@example.com'
            && $request['to'][0]['email'] === 'leader@example.com'
            && $request['subject'] === 'Reset your Bulan SeniorCare password'
            && str_contains($request['htmlContent'], 'https://seniorcare.example/reset-password?token='));
    }

    public function test_brevo_rejection_reports_the_email_could_not_be_sent(): void
    {
        config(['mail.default' => 'brevo', 'services.brevo.key' => 'bad-key', 'mail.from.address' => 'office@example.com']);
        Http::fake(['api.brevo.com/*' => Http::response(['message' => 'Key not found'], 401)]);
        User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);

        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertStatus(503);
        $this->assertSame(0, DB::table('password_reset_tokens')->count());
    }
}
