<?php

use App\Models\Barangay;
use Database\Seeders\BenefitSeeder;
use Database\Seeders\SampleDataSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;

return new class extends Migration
{
    public function up(): void
    {
        // Tests build their own data; the sample set would skew their counts.
        if (app()->runningUnitTests()) {
            return;
        }

        // Deploys only run migrations, so this is how the Railway database gets one BSCA account
        // per barangay (existing accounts and passwords are kept) and 20-30 sample seniors each.
        (new BenefitSeeder)->setContainer(app())->__invoke();
        (new SampleDataSeeder)->setContainer(app())->__invoke();

        Cache::forget(Barangay::LIST_CACHE_KEY);
    }

    public function down(): void
    {
        // Sample records may have been edited or linked to releases by now, so they stay.
    }
};
