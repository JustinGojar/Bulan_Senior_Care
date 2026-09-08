<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table): void {
            $table->string('valid_id_path')->nullable()->after('id_document_path');
            $table->string('birth_certificate_path')->nullable()->after('valid_id_path');
        });
    }

    public function down(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table): void {
            $table->dropColumn(['valid_id_path', 'birth_certificate_path']);
        });
    }
};