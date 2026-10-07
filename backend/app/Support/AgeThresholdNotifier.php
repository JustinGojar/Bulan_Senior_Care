<?php

namespace App\Support;

use App\Models\Benefit;
use App\Models\Notification;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Notifies the senior's barangay leader (plus Admin and Head) when an active
 * senior is within an Expanded Centenarians Act age bracket (octogenarian,
 * nonagenarian, centenarian) and has not received that benefit yet.
 * Notifications are de-duplicated, so running this repeatedly is safe.
 */
class AgeThresholdNotifier
{
    public const PROGRAM_TYPES = ['octogenarian', 'nonagenarian', 'centenarian'];

    public static function programs(): Collection
    {
        return Benefit::whereIn('benefit_type', self::PROGRAM_TYPES)->get();
    }

    /** Returns how many eligibility flags matched for this senior. */
    public static function notify(SeniorCitizen $senior, ?Collection $programs = null): int
    {
        if ($senior->status !== 'active' || ! $senior->birthdate) {
            return 0;
        }
        $programs ??= self::programs();
        $age = $senior->birthdate->age;
        $flags = 0;
        foreach ($programs as $program) {
            if ($age < $program->min_age || ($program->max_age && $age > $program->max_age)) {
                continue;
            }
            $alreadyReleased = DB::table('benefit_transactions')
                ->where('senior_citizen_id', $senior->id)
                ->where('benefit_id', $program->id)
                ->where('status', 'released')
                ->exists();
            if ($alreadyReleased) {
                continue;
            }
            $message = "{$senior->first_name} {$senior->last_name} is eligible for {$program->benefit_name}.";
            foreach (self::recipients($senior) as $recipient) {
                Notification::firstOrCreate([
                    'recipient_account_id' => $recipient->id,
                    'message' => $message,
                    'source_type' => 'age_threshold',
                    'source_id' => $senior->id,
                ], [
                    'channel' => 'in_app',
                    'date_sent' => now(),
                    'status' => 'unread',
                ]);
            }
            $flags++;
        }

        return $flags;
    }

    /** Checks every active senior, optionally limited to one barangay. */
    public static function notifyAll(?int $barangayId = null): int
    {
        $programs = self::programs();
        if ($programs->isEmpty()) {
            return 0;
        }
        $flags = 0;
        SeniorCitizen::query()
            ->where('status', 'active')
            ->when($barangayId, fn ($query) => $query->where('barangay_id', $barangayId))
            ->chunkById(100, function ($seniors) use ($programs, &$flags) {
                foreach ($seniors as $senior) {
                    $flags += self::notify($senior, $programs);
                }
            });

        return $flags;
    }

    private static function recipients(SeniorCitizen $senior): Collection
    {
        return User::query()
            ->where('status', 'active')
            ->where(function ($query) use ($senior) {
                $query->whereIn('role', ['admin', 'head'])
                    ->orWhere(fn ($leaderQuery) => $leaderQuery
                        ->where('role', 'leader')
                        ->where('barangay_id', $senior->barangay_id));
            })
            ->get();
    }
}
