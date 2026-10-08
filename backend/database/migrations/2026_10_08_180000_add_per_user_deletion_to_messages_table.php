<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Deleting a conversation hides it for that person only; the message row goes once
        // both people have deleted it.
        Schema::table('messages', function (Blueprint $table) {
            $table->timestamp('sender_deleted_at')->nullable()->after('read_at');
            $table->timestamp('recipient_deleted_at')->nullable()->after('sender_deleted_at');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['sender_deleted_at', 'recipient_deleted_at']);
        });
    }
};
