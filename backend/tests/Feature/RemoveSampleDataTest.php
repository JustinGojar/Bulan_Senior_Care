<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\SeniorCitizen;
use App\Models\User;
use Database\Seeders\BenefitSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RemoveSampleDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_cleanup_removes_only_samples_and_preserves_all_account_fields(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $barangay = Barangay::create(['barangay_name' => 'Zone 1']);
        $this->seed(BenefitSeeder::class);
        $benefit = Benefit::firstOrFail();
        foreach (['SAMPLE-01-001', 'DEMO-01', 'BSC-2026-001'] as $id) {
            $senior = SeniorCitizen::withoutEvents(fn () => SeniorCitizen::create([
                'osca_id_number' => $id, 'barangay_id' => $barangay->id,
                'encoded_by' => $user->id, 'first_name' => 'Test', 'last_name' => 'Senior',
                'birthdate' => '1950-01-01', 'sex' => 'female',
                'registration_date' => '2026-01-01', 'status' => 'active',
            ]));
            BenefitTransaction::create([
                'senior_citizen_id' => $senior->id, 'benefit_id' => $benefit->id,
                'distributed_by' => $user->id, 'amount' => 1000, 'status' => 'released',
            ]);
            DB::table('notifications')->insert([
                'recipient_account_id' => $user->id, 'source_type' => 'age_threshold',
                'source_id' => $senior->id, 'message' => 'Threshold alert',
                'channel' => 'in_app', 'status' => 'unread',
            ]);
            if ($id === 'DEMO-01') $senior->delete();
        }
        $accounts = DB::table('users')->get()->toJson();
        $this->artisan('osca:remove-sample-data')->assertSuccessful();
        $this->assertSame(3, SeniorCitizen::withTrashed()->count());
        $this->artisan('osca:remove-sample-data', ['--execute' => true])->assertSuccessful();
        $this->assertSame(1, SeniorCitizen::withTrashed()->count());
        $this->assertDatabaseHas('senior_citizens', ['osca_id_number' => 'BSC-2026-001']);
        $this->assertDatabaseCount('benefit_transactions', 1);
        $this->assertDatabaseCount('notifications', 1);
        $this->assertSame($accounts, DB::table('users')->get()->toJson());
        $this->artisan('osca:remove-sample-data', ['--execute' => true])->assertSuccessful();
        $this->assertDatabaseCount('senior_citizens', 1);
    }
}
