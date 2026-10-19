<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('analytics_reports', function (Blueprint $table) {
            // A string instead of an enum so the Head can return a report for revision.
            $table->string('status', 20)->default('draft')->change();
            $table->text('review_remarks')->nullable()->after('remarks');
            $table->foreignId('published_by')->nullable()->after('approved_by')->constrained('users')->nullOnDelete();
            // The report's figures as they were when it was generated, so a published report never changes.
            $table->json('snapshot')->nullable()->after('file_path');
        });
    }

    public function down(): void
    {
        Schema::table('analytics_reports', function (Blueprint $table) {
            $table->dropConstrainedForeignId('published_by');
            $table->dropColumn(['review_remarks', 'snapshot']);
        });
    }
};
