<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\SeniorCitizen;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\SampleDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_a_leader_account_and_twenty_to_thirty_seniors_per_barangay(): void
    {
        $this->seed(DatabaseSeeder::class);

        $barangays = Barangay::all();
        $expectedTotal = $barangays->sum(fn (Barangay $barangay) => SampleDataSeeder::countFor($barangay->barangay_name));

        $this->assertCount(64, $barangays);
        $this->assertSame(66, User::count());
        $this->assertSame($expectedTotal, SeniorCitizen::withTrashed()->count());

        foreach ($barangays as $barangay) {
            $leader = User::where('barangay_id', $barangay->id)->where('role', 'leader')->first();

            $this->assertNotNull($leader);
            $this->assertSame('bsca.'.Str::slug($barangay->barangay_name).'@osca-bulan.gov.ph', $leader->email);

            $seniors = SeniorCitizen::withTrashed()->where('barangay_id', $barangay->id)->get();
            $this->assertGreaterThanOrEqual(20, $seniors->count());
            $this->assertLessThanOrEqual(30, $seniors->count());
            $this->assertTrue($seniors->every(fn ($senior) => $senior->encoded_by === $leader->id));
            foreach (['active', 'pending', 'inactive'] as $status) {
                $this->assertTrue($seniors->contains('status', $status), "{$barangay->barangay_name} has no {$status} senior.");
            }
            $this->assertTrue($seniors->contains(fn ($senior) => $senior->trashed()));
        }

        // A changed leader password survives a re-run, and the sample set is not duplicated.
        $leader = User::where('role', 'leader')->firstOrFail();
        $leader->update(['password' => 'changed-password']);

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(66, User::count());
        $this->assertSame($expectedTotal, SeniorCitizen::withTrashed()->count());
        $this->assertTrue(password_verify('changed-password', $leader->fresh()->password));
    }
}
