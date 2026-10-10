<?php

namespace App\Support;

use App\Models\Benefit;
use App\Models\Notification;
use App\Models\SeniorCitizen;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Notifies the senior's barangay leader (plus Admin and Head) when an active
 * senior is at an Expanded Centenarians Act milestone age (octogenarian,
 * nonagenarian, centenarian) and has not received that grant since turning it.
 * Notifications are de-duplicated, so running this repeatedly is safe.
 */
class AgeThresholdNotifier
{
    public const PROGRAM_TYPES = ['octogenarian', 'nonagenarian', 'centenarian'];

    /**
     * The exact ages each grant is given at. Seniors at these ages still keep their
     * Social Pension, so they hold two benefits.
     */
    public const MILESTONE_AGES = [
        'octogenarian' => [80, 85],
        'nonagenarian' => [90, 95],
        'centenarian' => [100],
    ];

    /** @return list<int> */
    public static function milestoneAges(Benefit $program): array
    {
        return self::MILESTONE_AGES[$program->benefit_type] ?? [];
    }

    /**
     * Whether the senior was already paid this grant at their current milestone: anyone at
     * a milestone age turned it within the past year, so an earlier payment (at 80) does
     * not block the next one (at 85).
     */
    public static function receivedSince(Builder|EloquentBuilder $query, int $benefitId, CarbonInterface $since): void
    {
        $query->where('benefit_id', $benefitId)
            ->where('status', 'released')
            ->where(fn ($dated) => $dated->where('date_distributed', '>', $since->toDateString())
                ->orWhere(fn ($undated) => $undated->whereNull('date_distributed')->where('created_at', '>', $since)));
    }

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
            if (! in_array($age, self::milestoneAges($program), true)) {
                continue;
            }
            $alreadyReleased = DB::table('benefit_transactions')
                ->where('senior_citizen_id', $senior->id)
                ->tap(fn ($query) => self::receivedSince($query, $program->id, now()->subYear()))
                ->exists();
            if ($alreadyReleased) {
                continue;
            }
            // The age keeps the 85 notice separate from the one sent at 80. Matches claimMessage()
            // in the frontend.
            $message = "{$senior->first_name} {$senior->last_name} has turned {$age}. "
                ."You can now claim these benefits: Social Pension and {$program->benefit_name}.";
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
