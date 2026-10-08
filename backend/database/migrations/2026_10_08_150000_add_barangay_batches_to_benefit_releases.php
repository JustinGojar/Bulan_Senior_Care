<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A release is now scheduled per batch of barangays, so one benefit and period can have
        // several releases. Releases from before this change have no barangays: all of them.
        Schema::create('barangay_benefit_release', function (Blueprint $table) {
            $table->foreignId('benefit_release_id')->constrained()->cascadeOnDelete();
            $table->foreignId('barangay_id')->constrained()->cascadeOnDelete();
            $table->primary(['benefit_release_id', 'barangay_id']);
        });

        Schema::table('benefit_releases', function (Blueprint $table) {
            // The foreign key on benefit_id needs its own index before the unique one goes.
            $table->index('benefit_id', 'benefit_releases_benefit_id_index');
            $table->dropUnique('benefit_release_unique_period');
            $table->decimal('amount', 12, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('benefit_releases', function (Blueprint $table) {
            $table->unique(['benefit_id', 'period_label'], 'benefit_release_unique_period');
            $table->dropIndex('benefit_releases_benefit_id_index');
        });

        Schema::dropIfExists('barangay_benefit_release');
    }
};
