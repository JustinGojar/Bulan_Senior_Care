<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcement_comments', function (Blueprint $table) {
            $table->foreignId('parent_comment_id')->nullable()->after('user_id')->constrained('announcement_comments')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('announcement_comments', function (Blueprint $table) {
            $table->dropForeign(['parent_comment_id']);
            $table->dropColumn('parent_comment_id');
        });
    }
};