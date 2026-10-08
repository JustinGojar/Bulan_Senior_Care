<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\MessageConverter;
use Throwable;

/**
 * Sends mail through Brevo's HTTPS API. Railway blocks outbound SMTP on its
 * Free, Trial and Hobby plans, so production mail has to go over HTTPS.
 */
class BrevoTransport extends AbstractTransport
{
    public function __construct(
        private readonly string $key,
        private readonly int $timeout = 10,
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $envelope = $message->getEnvelope();
        $sender = $envelope->getSender();

        $recipients = fn (array $addresses): array => array_map(
            fn (Address $address): array => array_filter(['email' => $address->getAddress(), 'name' => $address->getName()]),
            $addresses,
        );

        $payload = array_filter([
            'sender' => array_filter(['email' => $sender->getAddress(), 'name' => $sender->getName()]),
            'to' => $recipients($email->getTo()),
            'cc' => $recipients($email->getCc()),
            'bcc' => $recipients($email->getBcc()),
            'replyTo' => ($replyTo = $email->getReplyTo()[0] ?? null)
                ? array_filter(['email' => $replyTo->getAddress(), 'name' => $replyTo->getName()])
                : null,
            'subject' => (string) $email->getSubject(),
            'htmlContent' => $email->getHtmlBody(),
            'textContent' => $email->getTextBody(),
            'attachment' => array_map(fn ($part): array => [
                'name' => $part->getFilename() ?? 'attachment',
                'content' => base64_encode($part->getBody()),
            ], $email->getAttachments()),
        ]);

        try {
            $response = Http::withHeaders(['api-key' => $this->key])
                ->acceptJson()
                ->timeout($this->timeout)
                ->post('https://api.brevo.com/v3/smtp/email', $payload);
        } catch (Throwable $exception) {
            throw new TransportException('Could not reach Brevo: '.$exception->getMessage(), 0, $exception);
        }

        if ($response->failed()) {
            throw new TransportException(sprintf(
                'Brevo rejected the email (HTTP %d): %s',
                $response->status(),
                $response->json('message') ?? $response->body(),
            ));
        }

        if ($messageId = $response->json('messageId')) {
            $message->setMessageId($messageId);
        }
    }

    public function __toString(): string
    {
        return 'brevo+api://api.brevo.com';
    }
}
