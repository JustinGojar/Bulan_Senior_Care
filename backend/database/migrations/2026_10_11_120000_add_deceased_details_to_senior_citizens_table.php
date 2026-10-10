<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Why a senior became inactive, with the documentation for it (a death certificate).
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->string('inactive_reason', 30)->nullable()->after('status');
            $table->date('date_of_death')->nullable()->after('inactive_reason');
            $table->string('death_certificate_path')->nullable()->after('date_of_death');
            $table->text('inactive_remarks')->nullable()->after('death_certificate_path');
            $table->foreignId('inactivated_by')->nullable()->after('inactive_remarks')->constrained('users')->nullOnDelete();
            $table->timestamp('inactivated_at')->nullable()->after('inactivated_by');
        });
    }

    public function down(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inactivated_by');
            $table->dropColumn(['inactive_reason', 'date_of_death', 'death_certificate_path', 'inactive_remarks', 'inactivated_at']);
        });
    }
};
