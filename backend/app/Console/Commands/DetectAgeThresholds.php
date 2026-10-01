<?php

namespace App\Console\Commands;

use App\Models\Benefit;
use App\Models\Notification;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DetectAgeThresholds extends Command
{
    protected $signature = 'osca:detect-age-thresholds';

    protected $description = 'Flag seniors newly eligible for age-based one-time benefits';

    public function handle(): int
    {
        $programs = Benefit::whereIn('benefit_type', ['octogenarian', 'nonagenarian', 'centenarian'])->get();
        $flags = 0;
        SeniorCitizen::with('barangay')->where('status', 'active')->chunkById(100, function ($seniors) use ($programs, &$flags) {
            foreach ($seniors as $senior) {
                $age = $senior->birthdate->age;
                foreach ($programs as $program) {
                    if ($age < $program->min_age || ($program->max_age && $age > $program->max_age)) {
                        continue;
                    }
                    $alreadyReleased = DB::table('benefit_transactions')->where('senior_citizen_id', $senior->id)->where('benefit_id', $program->id)->where('status', 'released')->exists();
                    if ($alreadyReleased) {
                        continue;
                    }
                    $message = "{$senior->first_name} {$senior->last_name} is eligible for {$program->benefit_name}.";
                    $recipients = User::query()
                        ->where('status', 'active')
                        ->where(function ($query) use ($senior) {
                            $query->whereIn('role', ['admin', 'head'])
                                ->orWhere(fn ($leaderQuery) => $leaderQuery
                                    ->where('role', 'leader')
                                    ->where('barangay_id', $senior->barangay_id));
                        })
                        ->get();
                    foreach ($recipients as $recipient) {
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
            }
        });
        $this->info("{$flags} eligibility flags generated.");

        return self::SUCCESS;
    }
}
