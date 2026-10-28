<?php

namespace App\Jobs;

use App\Support\AdvisorySettings;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Mail\Message;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class DeliverAdvisory implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public string $channel,
        public string $recipient,
        public string $subject,
        public string $message,
    ) {}

    public function backoff(): array
    {
        return [30, 120];
    }

    public function handle(): void
    {
        // Email is the only advisory channel.
        if ($this->channel !== 'email' || ! AdvisorySettings::enabled('email_advisories')) {
            return;
        }

        Mail::raw($this->message, function (Message $mail): void {
            $mail->to($this->recipient)->subject($this->subject);
        });
    }
}
