<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->string('privacy_consent_version', 20)->nullable();
            $table->timestamp('privacy_consent_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->dropColumn(['privacy_consent_version', 'privacy_consent_at']);
        });
    }
};
