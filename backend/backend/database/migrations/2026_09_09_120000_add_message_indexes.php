<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->index(['sender_id', 'created_at'], 'messages_sender_created_at_index');
            $table->index(['recipient_id', 'created_at'], 'messages_recipient_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_sender_created_at_index');
            $table->dropIndex('messages_recipient_created_at_index');
        });
    }
};