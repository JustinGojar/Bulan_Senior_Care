<?php

namespace Tests\Feature;

use App\Jobs\DeliverAdvisory;
use App\Models\Barangay;
use App\Models\SeniorCitizen;
use App\Models\User;
use App\Support\AdvisoryDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\TestCase;

class AdvisoryDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_persist_email_and_sms_channel_settings(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        config([
            'mail.default' => 'smtp',
            'mail.from.address' => 'noreply@example.test',
            'mail.mailers.smtp.host' => 'smtp.example.test',
            'mail.mailers.smtp.username' => 'mailer',
            'mail.mailers.smtp.password' => 'password',
            'services.semaphore.key' => 'test-api-key',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/notification-settings')
            ->assertOk()
            ->assertJsonPath('settings.email_advisories', false)
            ->assertJsonPath('settings.sms_advisories', false)
            ->assertJsonPath('configured.email_advisories', true)
            ->assertJsonPath('configured.sms_advisories', true);

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/notification-settings', [
                'email_advisories' => true,
                'sms_advisories' => true,
            ])
            ->assertOk()
            ->assertJsonPath('settings.email_advisories', true)
            ->assertJsonPath('settings.sms_advisories', true);

        $this->assertDatabaseHas('app_settings', [
            'key' => 'notification_channels',
            'value' => json_encode(['email_advisories' => true, 'sms_advisories' => true]),
        ]);
    }

    public function test_unconfigured_sms_channel_cannot_be_enabled(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        config(['services.semaphore.key' => null]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/notification-settings', ['sms_advisories' => true])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Set SEMAPHORE_API_KEY in the backend environment before enabling SMS advisories.');
    }

    public function test_pending_registration_and_distribution_events_queue_advisories(): void
    {
        Queue::fake();
        DB::table('app_settings')->insert([
            'key' => 'notification_channels',
            'value' => json_encode(['email_advisories' => true, 'sms_advisories' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $barangay = Barangay::create(['barangay_name' => 'Poblacion']);
        $leader = User::factory()->create([
            'role' => 'leader',
            'status' => 'active',
            'barangay_id' => $barangay->id,
            'email' => 'leader@example.test',
            'contact_number' => '09171234567',
        ]);
        $senior = SeniorCitizen::create([
            'osca_id_number' => 'OSCA-ADV-001',
            'barangay_id' => $barangay->id,
            'encoded_by' => $leader->id,
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'birthdate' => now()->subYears(72)->toDateString(),
            'sex' => 'female',
            'contact_number' => '09181234567',
            'registration_date' => today(),
            'status' => 'pending',
        ]);
        SeniorCitizen::create([
            'osca_id_number' => 'OSCA-ADV-002',
            'barangay_id' => $barangay->id,
            'encoded_by' => $leader->id,
            'first_name' => 'Jose',
            'last_name' => 'Reyes',
            'birthdate' => now()->subYears(75)->toDateString(),
            'sex' => 'male',
            'contact_number' => '09191234567',
            'registration_date' => today(),
            'status' => 'active',
        ]);

        AdvisoryDispatcher::forPendingSenior($senior);
        Queue::assertPushed(DeliverAdvisory::class, 3);
        Queue::assertPushed(DeliverAdvisory::class, fn (DeliverAdvisory $job) => $job->channel === 'email'
            && $job->recipient === 'leader@example.test');
        Queue::assertPushed(DeliverAdvisory::class, fn (DeliverAdvisory $job) => $job->channel === 'sms'
            && $job->recipient === '+639171234567');

        AdvisoryDispatcher::forBenefitRelease('Social Pension', '2026-Q4', 'October 31, 2026');
        Queue::assertPushed(DeliverAdvisory::class, 6);
        Queue::assertPushed(DeliverAdvisory::class, fn (DeliverAdvisory $job) => $job->channel === 'sms'
            && $job->recipient === '+639191234567');
    }

    public function test_sms_delivery_uses_configured_semaphore_account(): void
    {
        DB::table('app_settings')->insert([
            'key' => 'notification_channels',
            'value' => json_encode(['email_advisories' => false, 'sms_advisories' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        config(['services.semaphore.key' => 'test-api-key']);
        Http::fake(['https://api.semaphore.co/*' => Http::response([['message_id' => 'test']], 200)]);

        (new DeliverAdvisory('sms', '+639171234567', 'Schedule', 'Your schedule is ready.'))->handle();

        Http::assertSent(fn ($request) => $request->url() === 'https://api.semaphore.co/api/v4/messages'
            && $request['apikey'] === 'test-api-key'
            && $request['number'] === '+639171234567'
            && $request['message'] === 'Your schedule is ready.');
    }

    public function test_semaphore_delivery_failures_are_not_reported_as_success(): void
    {
        DB::table('app_settings')->insert([
            'key' => 'notification_channels',
            'value' => json_encode(['email_advisories' => false, 'sms_advisories' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        config(['services.semaphore.key' => 'test-api-key']);
        Http::fake(['https://api.semaphore.co/*' => Http::response([['status' => 'Failed']], 200)]);
        $this->expectException(RuntimeException::class);

        (new DeliverAdvisory('sms', '+639171234567', 'Schedule', 'Your schedule is ready.'))->handle();
    }
}
