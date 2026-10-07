<?php

namespace App\Console\Commands;

use App\Support\AgeThresholdNotifier;
use Illuminate\Console\Command;

class DetectAgeThresholds extends Command
{
    protected $signature = 'osca:detect-age-thresholds';

    protected $description = 'Flag seniors newly eligible for age-based one-time benefits';

    public function handle(): int
    {
        $flags = AgeThresholdNotifier::notifyAll();
        $this->info("{$flags} eligibility flags generated.");

        return self::SUCCESS;
    }
}
