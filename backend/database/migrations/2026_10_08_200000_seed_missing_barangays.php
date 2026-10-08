<?php

use App\Models\Barangay;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Deploys only run migrations, so a database that was never seeded had no barangays and
        // the barangay pickers were empty. Adds any that are missing; existing rows are left as they are.
        $existing = DB::table('barangays')->pluck('barangay_name')->all();
        $now = now();

        $missing = collect(DatabaseSeeder::BARANGAYS)
            ->map(fn (string $name, int $index) => [
                'barangay_name' => $name,
                'zone_number' => $index + 1,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->reject(fn (array $barangay) => in_array($barangay['barangay_name'], $existing, true))
            ->values()
            ->all();

        if ($missing !== []) {
            DB::table('barangays')->insert($missing);
        }

        // Plain inserts skip the model events that normally clear the cached list.
        Cache::forget(Barangay::LIST_CACHE_KEY);
    }

    public function down(): void
    {
        // Barangays may be referenced by seniors and accounts by now, so they stay.
    }
};
