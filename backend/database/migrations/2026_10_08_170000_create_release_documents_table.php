<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Proof kept with a release batch: signed lists, photos of the release day, payroll copies.
        Schema::create('release_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('benefit_release_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 100)->nullable();
            $table->unsignedInteger('size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('benefit_releases', function (Blueprint $table) {
            $table->timestamp('completed_at')->nullable()->after('remarks');
            $table->foreignId('completed_by')->nullable()->after('completed_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('benefit_releases', function (Blueprint $table) {
            $table->dropForeign(['completed_by']);
            $table->dropColumn(['completed_at', 'completed_by']);
        });

        Schema::dropIfExists('release_documents');
    }
};
