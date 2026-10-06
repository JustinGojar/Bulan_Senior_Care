<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use JsonException;
use RuntimeException;

class AdvisorySettings
{
    private const KEY = 'notification_channels';

    public static function all(): array
    {
        $stored = DB::table('app_settings')->where('key', self::KEY)->value('value');
        if (is_string($stored)) {
            try {
                $stored = json_decode($stored, true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException $exception) {
                throw new RuntimeException('Stored notification channel settings are invalid.', previous: $exception);
            }
        }
        if ($stored !== null && ! is_array($stored)) {
            throw new RuntimeException('Stored notification channel settings must be a JSON object.');
        }

        return array_replace([
            'email_advisories' => false,
            'sms_advisories' => false,
        ], $stored ?? []);
    }

    public static function enabled(string $channel): bool
    {
        return (bool) (self::all()[$channel] ?? false);
    }

    public static function save(array $settings): array
    {
        $next = array_replace(self::all(), $settings);
        DB::table('app_settings')->updateOrInsert(
            ['key' => self::KEY],
            ['value' => json_encode($next, JSON_THROW_ON_ERROR), 'updated_at' => now(), 'created_at' => now()],
        );

        return $next;
    }
}
