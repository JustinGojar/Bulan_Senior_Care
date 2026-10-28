<?php

namespace App\Support;

use App\Jobs\DeliverAdvisory;
use App\Models\SeniorCitizen;
use App\Models\User;

class AdvisoryDispatcher
{
    public static function forPendingSenior(SeniorCitizen $senior): void
    {
        if (! AdvisorySettings::enabled('email_advisories')) {
            return;
        }

        $leaders = User::query()
            ->where('role', 'president')
            ->where('status', 'active')
            ->where('barangay_id', $senior->barangay_id)
            ->get(['email']);

        $message = "Registration for {$senior->first_name} {$senior->last_name} (OSCA ID: {$senior->osca_id_number}) is awaiting validation.";
        foreach ($leaders as $leader) {
            self::email($leader->email, 'Senior registration pending validation', $message);
        }
    }

    /** @param  array<int, int>|null  $barangayIds  The release batch; null notifies every barangay. */
    public static function forBenefitRelease(string $benefitName, string $periodLabel, string $releaseDate, ?array $barangayIds = null): void
    {
        if (! AdvisorySettings::enabled('email_advisories')) {
            return;
        }

        $subject = "{$benefitName} distribution schedule";
        $message = "{$benefitName} distribution is scheduled for {$releaseDate} ({$periodLabel}).";
        User::query()
            ->where('role', 'president')
            ->where('status', 'active')
            ->when($barangayIds !== null, fn ($leaders) => $leaders->whereIn('barangay_id', $barangayIds))
            ->select(['id', 'email'])
            ->chunkById(100, function ($leaders) use ($subject, $message): void {
                foreach ($leaders as $leader) {
                    self::email($leader->email, $subject, $message);
                }
            });
    }

    /**
     * Emails one barangay president (e.g. a milestone grant to claim, documents to fix, or a
     * registration decision). Sent right after the response instead of through the queue, so
     * it goes out even when no queue worker is running.
     */
    public static function emailLeader(User $leader, string $subject, string $message): void
    {
        if (AdvisorySettings::enabled('email_advisories') && filled($leader->email)) {
            DeliverAdvisory::dispatchAfterResponse('email', $leader->email, $subject, $message);
        }
    }

    private static function email(?string $email, string $subject, string $message): void
    {
        if (filled($email)) {
            DeliverAdvisory::dispatch('email', $email, $subject, $message);
        }
    }
}
