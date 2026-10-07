<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TermsAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private function login(array $overrides = [])
    {
        return $this->postJson('/api/login', array_merge([
            'email' => 'staff@example.com',
            'password' => 'StrongPassword123!',
            'accepted_terms' => true,
            'terms_version' => '2026-10-07',
        ], $overrides));
    }

    protected function setUp(): void
    {
        parent::setUp();

        User::factory()->create([
            'email' => 'staff@example.com',
            'password' => 'StrongPassword123!',
        ]);
    }

    public function test_login_is_refused_without_agreeing_to_the_terms(): void
    {
        $this->login(['accepted_terms' => false])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['accepted_terms' => 'You must agree to the Terms and Conditions to sign in.']);

        $this->login(['accepted_terms' => null])->assertStatus(422)->assertJsonValidationErrors('accepted_terms');
        $this->login(['terms_version' => null])->assertStatus(422)->assertJsonValidationErrors('terms_version');

        $user = User::where('email', 'staff@example.com')->first();
        $this->assertNull($user->terms_accepted_at);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(0, AuditLog::count());
    }

    public function test_login_records_the_agreed_version_and_time(): void
    {
        Carbon::setTestNow('2026-10-07 09:30:00');

        $this->login()
            ->assertOk()
            ->assertJsonPath('user.terms_version', '2026-10-07');

        $user = User::where('email', 'staff@example.com')->first();
        $this->assertSame('2026-10-07', $user->terms_version);
        $this->assertTrue($user->terms_accepted_at->equalTo(Carbon::parse('2026-10-07 09:30:00')));

        $log = AuditLog::sole();
        $this->assertSame('accepted_terms', $log->action);
        $this->assertSame($user->id, $log->actor_id);
        $this->assertSame($user->id, $log->target_id);
        $this->assertNull($log->before_value);
        $this->assertSame(['terms_version' => '2026-10-07', 'ip_address' => '127.0.0.1'], $log->after_value);
    }

    public function test_audit_log_records_each_version_once(): void
    {
        Carbon::setTestNow('2026-10-07 09:30:00');
        $this->login()->assertOk();

        Carbon::setTestNow('2026-10-08 08:00:00');
        $this->login()->assertOk();

        $user = User::where('email', 'staff@example.com')->first();
        $this->assertTrue($user->terms_accepted_at->equalTo(Carbon::parse('2026-10-08 08:00:00')));
        $this->assertSame(1, AuditLog::count());

        $this->login(['terms_version' => '2027-01-15'])->assertOk();

        $this->assertSame(2, AuditLog::count());
        $latest = AuditLog::latest('id')->first();
        $this->assertSame(['terms_version' => '2026-10-07'], $latest->before_value);
        $this->assertSame('2027-01-15', $latest->after_value['terms_version']);
    }

    public function test_failed_login_records_nothing(): void
    {
        $this->login(['password' => 'wrong-password'])->assertStatus(422);

        $this->assertNull(User::where('email', 'staff@example.com')->first()->terms_accepted_at);
        $this->assertSame(0, AuditLog::count());
    }
}
