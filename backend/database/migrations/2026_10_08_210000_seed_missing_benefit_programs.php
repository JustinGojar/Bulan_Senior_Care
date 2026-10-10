<?php

use App\Models\Benefit;
use Database\Seeders\BenefitSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Deploys only run migrations, so a database that was never seeded had no benefit programs
        // and the Add Release benefit picker was empty. Adds any that are missing; existing rows are
        // left as they are. Tests create the programs they need, and benefit_type is unique.
        if (app()->runningUnitTests()) {
            return;
        }

        $existing = DB::table('benefits')->pluck('benefit_type')->all();
        $now = now();

        $missing = collect(BenefitSeeder::PROGRAMS)
            ->reject(fn (array $program) => in_array($program['benefit_type'], $existing, true))
            ->map(fn (array $program) => [...$program, 'status' => 'active', 'created_at' => $now, 'updated_at' => $now])
            ->values()
            ->all();

        if ($missing !== []) {
            DB::table('benefits')->insert($missing);
        }

        // Plain inserts skip the model events that normally clear the cached list.
        Cache::forget(Benefit::ACTIVE_LIST_CACHE_KEY);
    }

    public function down(): void
    {
        // Programs may be referenced by transactions and releases by now, so they stay.
    }
};
