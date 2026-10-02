<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->string('facebook_post_id')->nullable()->unique();
            $table->string('source_url', 2048)->nullable();
            $table->text('source_image_url')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropUnique(['facebook_post_id']);
            $table->dropColumn(['facebook_post_id', 'source_url', 'source_image_url']);
        });
    }
};