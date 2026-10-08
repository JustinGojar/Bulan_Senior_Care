<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('benefit_transactions', function (Blueprint $table) {
            // The release batch that listed this senior, so the batch's roster can be shown.
            $table->foreignId('benefit_release_id')->nullable()->after('payroll_batch_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('benefit_transactions', function (Blueprint $table) {
            $table->dropForeign(['benefit_release_id']);
            $table->dropColumn('benefit_release_id');
        });
    }
};
