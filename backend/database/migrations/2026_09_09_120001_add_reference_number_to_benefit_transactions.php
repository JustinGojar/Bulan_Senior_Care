<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('benefit_transactions', function (Blueprint $table) {
            $table->string('reference_number')->nullable()->after('period_label');
        });
    }

    public function down(): void
    {
        Schema::table('benefit_transactions', function (Blueprint $table) {
            $table->dropColumn('reference_number');
        });
    }
};