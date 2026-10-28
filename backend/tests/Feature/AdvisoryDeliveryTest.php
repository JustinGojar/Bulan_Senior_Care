<?php

namespace Tests\Feature;

use App\Jobs\DeliverAdvisory;
use App\Models\Barangay;
use App\Models\SeniorCitizen;
use App\Models\User;
use App\Support\AdvisoryDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AdvisoryDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_persist_email_channel_setting(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        config([
            'mail.default' => 'smtp',
            'mail.from.address' => 'noreply@example.test',
            'mail.mailers.smtp.host' => 'smtp.example.test',
            'mail.mailers.smtp.username' => 'mailer',
            'mail.mailers.smtp.password' => 'password',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/notification-settings')
            ->assertOk()
            ->assertExactJson([
                'settings' => ['email_advisories' => false],
                'configured' => ['email_advisories' => true],
            ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/notification-settings', ['email_advisories' => true])
            ->assertOk()
            ->assertExactJson(['settings' => ['email_advisories' => true]]);

        $this->assertDatabaseHas('app_settings', [
            'key' => 'notification_channels',
            'value' => json_encode(['email_advisories' => true]),
        ]);
    }

    public function test_sms_channel_is_not_available(): void
    {
        /** @var User $admin */
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/notification-settings', ['sms_advisories' => true])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Select at least one notification channel to update.');
    }

    public function test_pending_registration_and_distribution_events_queue_advisories(): void
    {
        Queue::fake();
        DB::table('app_settings')->insert([
            'key' => 'notification_channels',
            'value' => json_encode(['email_advisories' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $barangay = Barangay::create(['barangay_name' => 'Poblacion']);
        $leader = User::factory()->create([
            'role' => 'president',
            'status' => 'active',
            'barangay_id' => $barangay->id,
            'email' => 'president@example.test',
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
        Queue::assertPushed(DeliverAdvisory::class, 1);
        Queue::assertPushed(DeliverAdvisory::class, fn (DeliverAdvisory $job) => $job->channel === 'email'
            && $job->recipient === 'president@example.test');

        AdvisoryDispatcher::forBenefitRelease('Social Pension', '2026-Q4', 'October 31, 2026');
        Queue::assertPushed(DeliverAdvisory::class, 2);
        Queue::assertNotPushed(DeliverAdvisory::class, fn (DeliverAdvisory $job) => $job->channel !== 'email');
    }
}
