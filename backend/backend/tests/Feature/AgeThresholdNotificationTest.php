<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class AgeThresholdNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_age_threshold_alerts_only_notify_active_leaders_in_the_senior_barangay_once(): void
    {
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        $otherBarangay = Barangay::create(['barangay_name' => 'Zone 2']);
        /** @var User $localLeader */
        $localLeader = User::factory()->create([
            'role' => 'leader',
            'status' => 'active',
            'barangay_id' => $barangay->id,
        ]);
        /** @var User $otherLeader */
        $otherLeader = User::factory()->create([
            'role' => 'leader',
            'status' => 'active',
            'barangay_id' => $otherBarangay->id,
        ]);
        /** @var User $inactiveLeader */
        $inactiveLeader = User::factory()->create([
            'role' => 'leader',
            'status' => 'inactive',
            'barangay_id' => $barangay->id,
        ]);

        $senior = SeniorCitizen::create([
            'osca_id_number' => 'OSCA-AGE-001',
            'barangay_id' => $barangay->id,
            'encoded_by' => $localLeader->id,
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'birthdate' => now()->subYears(80)->toDateString(),
            'sex' => 'female',
            'registration_date' => now()->toDateString(),
            'status' => 'active',
        ]);
        Benefit::create([
            'benefit_name' => 'Octogenarian Grant',
            'benefit_type' => 'octogenarian',
            'min_age' => 80,
            'max_age' => 89,
            'amount' => 10000,
            'funding_source' => 'Municipal',
            'schedule' => 'One-time',
            'status' => 'active',
        ]);

        Artisan::call('osca:detect-age-thresholds');
        Artisan::call('osca:detect-age-thresholds');

        $this->assertDatabaseHas('notifications', [
            'recipient_account_id' => $localLeader->id,
            'message' => 'Maria Santos is eligible for Octogenarian Grant.',
            'source_type' => 'age_threshold',
            'source_id' => $senior->id,
            'channel' => 'in_app',
            'status' => 'unread',
        ]);
        $this->assertDatabaseMissing('notifications', ['recipient_account_id' => $otherLeader->id]);
        $this->assertDatabaseMissing('notifications', ['recipient_account_id' => $inactiveLeader->id]);
        $this->assertDatabaseCount('notifications', 1);
    }
}
