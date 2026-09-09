<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('benefit_releases', function (Blueprint $table) {
            $table->decimal('amount', 12, 2)->after('period_label');
        });
    }

    public function down(): void
    {
        Schema::table('benefit_releases', function (Blueprint $table) {
            $table->dropColumn('amount');
        });
    }
};