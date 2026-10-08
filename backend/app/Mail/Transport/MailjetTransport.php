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
 * Sends mail through Mailjet's HTTPS Send API (v3.1). Railway blocks outbound
 * SMTP on its Free, Trial and Hobby plans, so production mail has to go over HTTPS.
 */
class MailjetTransport extends AbstractTransport
{
    public function __construct(
        private readonly string $key,
        private readonly string $secret,
        private readonly int $timeout = 10,
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $sender = $message->getEnvelope()->getSender();

        $contact = fn (Address $address): array => array_filter(['Email' => $address->getAddress(), 'Name' => $address->getName()]);
        $replyTo = $email->getReplyTo()[0] ?? null;

        $payload = array_filter([
            'From' => $contact($sender),
            'To' => array_map($contact, $email->getTo()),
            'Cc' => array_map($contact, $email->getCc()),
            'Bcc' => array_map($contact, $email->getBcc()),
            'ReplyTo' => $replyTo ? $contact($replyTo) : null,
            'Subject' => (string) $email->getSubject(),
            'TextPart' => $email->getTextBody(),
            'HTMLPart' => $email->getHtmlBody(),
            'Attachments' => array_map(fn ($part): array => [
                'ContentType' => $part->getMediaType().'/'.$part->getMediaSubtype(),
                'Filename' => $part->getFilename() ?? 'attachment',
                'Base64Content' => base64_encode($part->getBody()),
            ], $email->getAttachments()),
        ]);

        try {
            $response = Http::withBasicAuth($this->key, $this->secret)
                ->acceptJson()
                ->timeout($this->timeout)
                ->post('https://api.mailjet.com/v3.1/send', ['Messages' => [$payload]]);
        } catch (Throwable $exception) {
            throw new TransportException('Could not reach Mailjet: '.$exception->getMessage(), 0, $exception);
        }

        if ($response->failed() || $response->json('Messages.0.Status') !== 'success') {
            throw new TransportException(sprintf(
                'Mailjet rejected the email (HTTP %d): %s',
                $response->status(),
                $response->json('Messages.0.Errors.0.ErrorMessage') ?? $response->json('ErrorMessage') ?? $response->body(),
            ));
        }

        if ($messageId = $response->json('Messages.0.To.0.MessageID')) {
            $message->setMessageId((string) $messageId);
        }
    }

    public function __toString(): string
    {
        return 'mailjet+api://api.mailjet.com';
    }
}
