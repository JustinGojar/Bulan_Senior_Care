<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\Notification;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_registration_notifies_the_active_admin_and_head(): void
    {
        [$president, $admin, $head, $inactiveHead] = $this->accounts();

        $this->actingAs($president, 'sanctum')->postJson('/api/seniors', [
            'privacy_consent' => true,
            'privacy_consent_version' => '2026-10-07',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'birthdate' => '1960-01-01',
            'sex' => 'male',
            'contact_number' => '09123456789',
            'benefit' => 'Social Pension',
        ])->assertCreated();

        $senior = SeniorCitizen::where('last_name', 'Dela Cruz')->firstOrFail();
        $this->assertSame('pending', $senior->status);
        foreach ([$admin, $head] as $reviewer) {
            $this->assertDatabaseHas('notifications', [
                'recipient_account_id' => $reviewer->id,
                'sender_account_id' => $president->id,
                'source_type' => 'registration_pending',
                'source_id' => $senior->id,
                'message' => "Pres. Santos registered Juan Dela Cruz ({$senior->osca_id_number}). The registration is waiting for eligibility review.",
            ]);
        }
        $this->assertDatabaseMissing('notifications', ['recipient_account_id' => $inactiveHead->id, 'source_type' => 'registration_pending']);
        $this->assertDatabaseMissing('notifications', ['recipient_account_id' => $president->id, 'source_type' => 'registration_pending']);
    }

    public function test_a_bulk_upload_sends_one_summary_notification_per_reviewer(): void
    {
        [$president, $admin, $head] = $this->accounts();
        $row = fn (string $first, string $contact) => [
            'first_name' => $first,
            'last_name' => 'Santos',
            'birthdate' => '1955-03-04',
            'sex' => 'female',
            'contact_number' => $contact,
            'barangay' => 'Zone 8 (Loyo)',
            'benefit' => 'Social Pension',
        ];

        $this->actingAs($president, 'sanctum')->postJson('/api/seniors/bulk', [
            'records' => [$row('Maria', '09171234561'), $row('Ana', '09171234562'), $row('Rosa', '09171234563')],
        ])->assertCreated()->assertJsonCount(3, 'created');

        foreach ([$admin, $head] as $reviewer) {
            $notices = Notification::where('recipient_account_id', $reviewer->id)->where('source_type', 'registration_pending')->get();
            $this->assertCount(1, $notices);
            $this->assertSame('Pres. Santos registered 3 seniors by bulk upload. The registrations are waiting for eligibility review.', $notices->first()->message);
        }
    }

    public function test_a_bulk_upload_with_no_saved_rows_notifies_no_one(): void
    {
        [$president] = $this->accounts();

        $this->actingAs($president, 'sanctum')->postJson('/api/seniors/bulk', [
            'records' => [[
                'first_name' => 'Too',
                'last_name' => 'Young',
                'birthdate' => now()->subYears(40)->toDateString(),
                'sex' => 'male',
                'contact_number' => '09171234564',
                'barangay' => 'Zone 8 (Loyo)',
                'benefit' => 'Social Pension',
            ]],
        ])->assertOk()->assertJsonCount(0, 'created');

        $this->assertDatabaseMissing('notifications', ['source_type' => 'registration_pending']);
    }

    /** @return array{User, User, User, User} president, admin, head, inactive head */
    private function accounts(): array
    {
        $barangay = Barangay::firstOrCreate(['barangay_name' => 'Zone 8 (Loyo)']);
        Benefit::firstOrCreate(['benefit_type' => 'social_pension'], [
            'benefit_name' => 'Social Pension',
            'min_age' => 60,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);

        return [
            User::factory()->create(['role' => 'president', 'status' => 'active', 'name' => 'Pres. Santos', 'barangay_id' => $barangay->id]),
            User::factory()->create(['role' => 'admin', 'status' => 'active']),
            User::factory()->create(['role' => 'head', 'status' => 'active']),
            User::factory()->create(['role' => 'head', 'status' => 'inactive']),
        ];
    }
}
