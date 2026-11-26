<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ZoneBarangayNamesTest extends TestCase
{
    use RefreshDatabase;

    public function test_existing_zones_and_generated_profiles_are_renamed_without_changing_logins_or_assignments(): void
    {
        $zones = [];
        foreach (range(1, 8) as $number) {
            $zones[] = Barangay::create(['barangay_name' => "Zone {$number} (Old name)"]);
        }
        $president = User::factory()->create([
            'role' => 'president',
            'barangay_id' => $zones[4]->id,
            'name' => 'BSCA - Zone 5 (Old name)',
            'first_name' => 'BSCA',
            'last_name' => 'Zone 5 (Old name)',
        ]);
        $email = $president->email;
        $password = $president->getRawOriginal('password');
        $personal = User::factory()->create([
            'barangay_id' => $zones[0]->id, 'name' => 'Maria Santos',
        ]);
        Cache::put(Barangay::LIST_CACHE_KEY, ['stale']);

        $migration = require database_path('migrations/2026_11_26_100000_shorten_zone_barangay_names.php');
        $migration->up();
        $migration->up();

        foreach ($zones as $index => $zone) {
            $this->assertSame('Zone '.($index + 1), $zone->fresh()->barangay_name);
        }
        $president->refresh();
        $this->assertSame('BSCA - Zone 5', $president->name);
        $this->assertSame('Zone 5', $president->last_name);
        $this->assertSame('Zone 5, Bulan, Sorsogon', $president->address);
        $this->assertEquals($zones[4]->id, $president->barangay_id);
        $this->assertSame($email, $president->email);
        $this->assertSame($password, $president->getRawOriginal('password'));
        $this->assertSame('Maria Santos', $personal->fresh()->name);
        $this->assertNull(Cache::get(Barangay::LIST_CACHE_KEY));
    }
}
