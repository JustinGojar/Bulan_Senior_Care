<?php

namespace App\Support;

use App\Jobs\DeliverAdvisory;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class AdvisoryDispatcher
{
    public static function forPendingSenior(SeniorCitizen $senior): void
    {
        $settings = AdvisorySettings::all();
        if (! $settings['email_advisories'] && ! $settings['sms_advisories']) {
            return;
        }

        $leaders = User::query()
            ->where('role', 'leader')
            ->where('status', 'active')
            ->where('barangay_id', $senior->barangay_id)
            ->get(['email', 'contact_number']);

        $message = "Registration for {$senior->first_name} {$senior->last_name} (OSCA ID: {$senior->osca_id_number}) is awaiting validation.";
        foreach ($leaders as $leader) {
            self::deliverTo($settings, $leader->email, $leader->contact_number, 'Senior registration pending validation', $message);
        }
        self::sendSms($settings, $senior->contact_number, 'Registration received', 'Your senior citizen registration is awaiting validation.');
    }

    /** @param  array<int, int>|null  $barangayIds  The release batch; null notifies every barangay. */
    public static function forBenefitRelease(string $benefitName, string $periodLabel, string $releaseDate, ?array $barangayIds = null): void
    {
        $settings = AdvisorySettings::all();
        if (! $settings['email_advisories'] && ! $settings['sms_advisories']) {
            return;
        }

        $subject = "{$benefitName} distribution schedule";
        $message = "{$benefitName} distribution is scheduled for {$releaseDate} ({$periodLabel}).";
        User::query()
            ->where('role', 'leader')
            ->where('status', 'active')
            ->when($barangayIds !== null, fn ($leaders) => $leaders->whereIn('barangay_id', $barangayIds))
            ->select(['id', 'email', 'contact_number'])
            ->chunkById(100, function ($leaders) use ($settings, $subject, $message): void {
                foreach ($leaders as $leader) {
                    self::deliverTo($settings, $leader->email, $leader->contact_number, $subject, $message);
                }
            });

        SeniorCitizen::query()
            ->where('status', 'active')
            ->whereNotNull('contact_number')
            ->when($barangayIds !== null, fn ($seniors) => $seniors->whereIn('barangay_id', $barangayIds))
            ->select(['id', 'contact_number'])
            ->chunkById(500, function ($seniors) use ($settings, $subject, $message): void {
                foreach ($seniors as $senior) {
                    self::sendSms($settings, $senior->contact_number, $subject, $message);
                }
            });
    }

    private static function deliverTo(array $settings, ?string $email, ?string $phone, string $subject, string $message): void
    {
        if ($settings['email_advisories'] && filled($email)) {
            DeliverAdvisory::dispatch('email', $email, $subject, $message);
        }
        self::sendSms($settings, $phone, $subject, $message);
    }

    private static function sendSms(array $settings, ?string $phone, string $subject, string $message): void
    {
        if (! $settings['sms_advisories'] || blank($phone)) {
            return;
        }

        $normalizedPhone = self::normalizePhone($phone);
        if ($normalizedPhone === null) {
            Log::warning('Skipped advisory SMS for an invalid contact number.');

            return;
        }
        DeliverAdvisory::dispatch('sms', $normalizedPhone, $subject, $message);
    }

    private static function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (! is_string($digits)) {
            return null;
        }
        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = '63'.substr($digits, 1);
        } elseif (strlen($digits) === 10 && str_starts_with($digits, '9')) {
            $digits = '63'.$digits;
        }

        return strlen($digits) >= 11 && strlen($digits) <= 15 ? '+'.$digits : null;
    }
}
