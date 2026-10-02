<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\SeniorCitizen;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_a_leader_account_and_five_seniors_per_barangay(): void
    {
        $this->seed(DatabaseSeeder::class);

        $barangays = Barangay::all();

        $this->assertCount(64, $barangays);
        $this->assertSame(66, User::count());
        $this->assertSame(320, SeniorCitizen::count());

        foreach ($barangays as $barangayIndex => $barangay) {
            $leader = User::where('barangay_id', $barangay->id)
                ->where('role', 'leader')
                ->first();

            $this->assertNotNull($leader);
            $this->assertSame(
                'bsca.'.Str::slug($barangay->barangay_name).'@osca-bulan.gov.ph',
                $leader->email,
            );
            $this->assertSame(5, SeniorCitizen::where('barangay_id', $barangay->id)->count());
            $this->assertSame(
                ['active' => 3, 'inactive' => 1, 'pending' => 1],
                SeniorCitizen::where('barangay_id', $barangay->id)
                    ->selectRaw('status, count(*) as total')
                    ->groupBy('status')
                    ->orderBy('status')
                    ->pluck('total', 'status')
                    ->sortKeys()
                    ->all(),
            );
        }

        foreach ($barangays as $barangayIndex => $barangay) {
            $legacySenior = SeniorCitizen::where('barangay_id', $barangay->id)->firstOrFail()->replicate();
            $legacySenior->osca_id_number = sprintf(
                'DEMO-%d-%04d',
                today()->year,
                ($barangayIndex * 10) + 6,
            );
            $legacySenior->save();
        }

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(66, User::count());
        $this->assertSame(320, SeniorCitizen::count());
        $this->assertSame(384, SeniorCitizen::withTrashed()->count());
        $this->assertSame(64, SeniorCitizen::onlyTrashed()->count());
    }
}
