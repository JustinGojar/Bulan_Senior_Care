<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A pending registration whose documents need fixing: what is wrong, and who flagged it.
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->text('review_note')->nullable()->after('status');
            $table->foreignId('review_flagged_by')->nullable()->after('review_note')->constrained('users')->nullOnDelete();
            $table->timestamp('review_flagged_at')->nullable()->after('review_flagged_by');
        });
    }

    public function down(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->dropConstrainedForeignId('review_flagged_by');
            $table->dropColumn(['review_note', 'review_flagged_at']);
        });
    }
};
