<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
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

    public function test_reset_email_is_sent_through_the_mailjet_api(): void
    {
        config([
            'mail.default' => 'mailjet',
            'services.mailjet.key' => 'test-key',
            'services.mailjet.secret' => 'test-secret',
            'mail.from.address' => 'office@example.com',
            'mail.from.name' => 'Bulan SeniorCare',
            'app.frontend_url' => 'https://seniorcare.example',
        ]);
        Http::fake(['api.mailjet.com/*' => Http::response(['Messages' => [[
            'Status' => 'success',
            'To' => [['Email' => 'leader@example.com', 'MessageID' => 123]],
        ]]])]);
        User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);

        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertOk();

        Http::assertSent(function (Request $request) {
            $message = $request['Messages'][0];

            return $request->url() === 'https://api.mailjet.com/v3.1/send'
                && $request->hasHeader('Authorization', 'Basic '.base64_encode('test-key:test-secret'))
                && $message['From']['Email'] === 'office@example.com'
                && $message['To'][0]['Email'] === 'leader@example.com'
                && $message['Subject'] === 'Reset your Bulan SeniorCare password'
                && str_contains($message['HTMLPart'], 'https://seniorcare.example/reset-password?token=');
        });
    }

    public function test_mailjet_rejection_reports_the_email_could_not_be_sent(): void
    {
        config([
            'mail.default' => 'mailjet',
            'services.mailjet.key' => 'bad-key',
            'services.mailjet.secret' => 'bad-secret',
            'mail.from.address' => 'office@example.com',
        ]);
        Http::fake(['api.mailjet.com/*' => Http::response(['ErrorMessage' => 'API key authentication/authorization failure'], 401)]);
        User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);

        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertStatus(503);
        $this->assertSame(0, DB::table('password_reset_tokens')->count());
    }

    public function test_reset_email_is_sent_through_the_gmail_relay(): void
    {
        config([
            'mail.default' => 'gmail',
            'services.gmail_script.url' => 'https://script.google.com/macros/s/abc/exec',
            'services.gmail_script.secret' => 'relay-secret',
            'mail.from.name' => 'Bulan SeniorCare',
            'app.frontend_url' => 'https://seniorcare.example',
        ]);
        Http::fake(['script.google.com/*' => Http::response(['ok' => true, 'remaining' => 99])]);
        User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);

        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertOk();

        Http::assertSent(fn (Request $request) => $request->url() === 'https://script.google.com/macros/s/abc/exec'
            && $request['secret'] === 'relay-secret'
            && $request['to'] === ['leader@example.com']
            && $request['fromName'] === 'Bulan SeniorCare'
            && $request['subject'] === 'Reset your Bulan SeniorCare password'
            && str_contains($request['html'], 'https://seniorcare.example/reset-password?token='));
    }

    public function test_gmail_relay_failure_reports_the_email_could_not_be_sent(): void
    {
        config([
            'mail.default' => 'gmail',
            'services.gmail_script.url' => 'https://script.google.com/macros/s/abc/exec',
            'services.gmail_script.secret' => 'wrong-secret',
        ]);
        // Apps Script always answers 200, so failures are reported in the body.
        Http::fake(['script.google.com/*' => Http::response(['ok' => false, 'error' => 'Unauthorized'])]);
        User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);

        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertStatus(503);
        $this->assertSame(0, DB::table('password_reset_tokens')->count());
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

    public function test_reset_email_uses_branded_template_with_logo(): void
    {
        config(['app.frontend_url' => 'https://seniorcare.example']);
        $user = User::factory()->create(['name' => 'Maria Santos']);
        $url = 'https://seniorcare.example/reset-password?token=abc&email=maria%40example.com';

        $html = (string) (new ResetPasswordNotification($url))->toMail($user)->render();

        $this->assertStringContainsString('src="https://seniorcare.example/email-logo.png"', $html);
        $this->assertStringContainsString('Hello Maria Santos,', $html);
        $this->assertStringContainsString('href="'.e($url).'"', $html);
        $this->assertStringContainsString('<strong>15 minutes</strong>', $html);
    }

    public function test_reset_link_expires_after_fifteen_minutes(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'leader@example.com', 'status' => 'active']);
        $this->postJson('/api/forgot-password', ['email' => 'leader@example.com'])->assertOk();

        $url = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use ($user, &$url) {
            $url = $notification->toMail($user)->actionUrl;

            return true;
        });
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

        $this->travel(16)->minutes();

        $this->postJson('/api/reset-password', [
            'token' => $query['token'],
            'email' => $query['email'],
            'password' => 'NewPass#2026',
            'password_confirmation' => 'NewPass#2026',
        ])->assertStatus(422);
    }
}
