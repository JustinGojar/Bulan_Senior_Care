<?php

namespace App\Jobs;

use App\Support\AdvisorySettings;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Mail\Message;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

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
        $settingKey = $this->channel === 'email' ? 'email_advisories' : 'sms_advisories';
        if (! AdvisorySettings::enabled($settingKey)) {
            return;
        }

        if ($this->channel === 'email') {
            Mail::raw($this->message, function (Message $mail): void {
                $mail->to($this->recipient)->subject($this->subject);
            });

            return;
        }

        $apiKey = config('services.semaphore.key');
        if (blank($apiKey)) {
            throw new RuntimeException('SEMAPHORE_API_KEY is not configured.');
        }

        $response = Http::asForm()
            ->timeout(15)
            ->post('https://api.semaphore.co/api/v4/messages', array_filter([
                'apikey' => $apiKey,
                'number' => $this->recipient,
                'message' => $this->message,
                'sendername' => config('services.semaphore.sender_name'),
            ], static fn ($value) => $value !== null && $value !== ''));
        $response->throw();

        $body = $response->json();
        if (! is_array($body) || $body === []) {
            throw new RuntimeException('Semaphore returned no delivery result for the SMS advisory.');
        }
        foreach (array_is_list($body) ? $body : [$body] as $result) {
            if (is_array($result) && in_array(strtolower((string) ($result['status'] ?? '')), ['failed', 'error', 'rejected'], true)) {
                throw new RuntimeException('Semaphore rejected the SMS advisory.');
            }
        }
    }
}
