<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\SeniorCitizen;
use App\Models\User;
use Database\Seeders\BscaPresidentSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\SampleDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_change_flag_exists_before_bsca_seeding_and_survives_later_migration(): void
    {
        $earlyMigration = require database_path('migrations/2026_10_10_125000_add_password_change_flag_to_users.php');
        $laterMigration = require database_path('migrations/2026_11_11_120000_add_system_roles_and_password_change_flag.php');

        $earlyMigration->down();
        $this->assertFalse(Schema::hasColumn('users', 'must_change_password'));
        $earlyMigration->up();
        $this->seed(BscaPresidentSeeder::class);
        $this->assertSame(64, User::where('must_change_password', true)->count());

        $laterMigration->up();
        $earlyMigration->up(); // Already-upgraded databases can apply the earlier migration safely.
        $laterMigration->down();
        $this->assertSame(64, User::where('must_change_password', true)->count());
    }

    public function test_default_seeding_preserves_accounts_without_creating_sample_records(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->assertSame(68, User::count());
        $this->assertSame(0, SeniorCitizen::withTrashed()->count());
    }

    public function test_it_seeds_a_president_account_and_twenty_to_thirty_seniors_per_barangay(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(SampleDataSeeder::class);

        $barangays = Barangay::all();
        $expectedTotal = $barangays->sum(fn (Barangay $barangay) => SampleDataSeeder::countFor($barangay->barangay_name));

        $this->assertCount(64, $barangays);
        $this->assertSame(68, User::count());
        $this->assertSame($expectedTotal, SeniorCitizen::withTrashed()->count());

        foreach ($barangays as $barangay) {
            $president = User::where('barangay_id', $barangay->id)->where('role', 'president')->first();

            $this->assertNotNull($president);
            $this->assertSame('bsca.'.Str::slug($barangay->barangay_name).'@osca-bulan.gov.ph', $president->email);

            $seniors = SeniorCitizen::withTrashed()->where('barangay_id', $barangay->id)->get();
            $this->assertGreaterThanOrEqual(20, $seniors->count());
            $this->assertLessThanOrEqual(30, $seniors->count());
            $this->assertTrue($seniors->every(fn ($senior) => $senior->encoded_by === $president->id));
            foreach (['active', 'pending', 'inactive'] as $status) {
                $this->assertTrue($seniors->contains('status', $status), "{$barangay->barangay_name} has no {$status} senior.");
            }
            $this->assertTrue($seniors->contains(fn ($senior) => $senior->trashed()));
        }

        // A changed president password survives a re-run, and the sample set is not duplicated.
        $president = User::where('role', 'president')->firstOrFail();
        $president->update(['password' => 'changed-password']);

        $this->seed(DatabaseSeeder::class);
        $this->seed(SampleDataSeeder::class);

        $this->assertSame(68, User::count());
        $this->assertSame($expectedTotal, SeniorCitizen::withTrashed()->count());
        $this->assertTrue(password_verify('changed-password', $president->fresh()->password));
    }
}
