<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** OSCA has no SMS advisory service, so SMS is dropped as a notification channel. */
    public function up(): void
    {
        DB::table('notifications')->where('channel', 'sms')->delete();
        Schema::table('notifications', function (Blueprint $table) {
            $table->enum('channel', ['email', 'in_app'])->change();
        });

        $stored = DB::table('app_settings')->where('key', 'notification_channels')->value('value');
        $settings = is_string($stored) ? json_decode($stored, true) : null;
        if (is_array($settings) && array_key_exists('sms_advisories', $settings)) {
            unset($settings['sms_advisories']);
            DB::table('app_settings')->where('key', 'notification_channels')
                ->update(['value' => json_encode($settings), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->enum('channel', ['email', 'sms', 'in_app'])->change();
        });
    }
};
