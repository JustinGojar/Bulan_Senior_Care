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
 * Sends mail from a Gmail account through the Apps Script web app in
 * docs/gmail-relay/Code.gs. It goes over HTTPS (Railway blocks SMTP below the
 * Pro plan) and the mail really comes from Gmail, so it is not flagged as spoofed.
 */
class GmailScriptTransport extends AbstractTransport
{
    public function __construct(
        private readonly string $url,
        private readonly string $secret,
        private readonly int $timeout = 20,
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $addresses = fn (array $list): array => array_map(fn (Address $address): string => $address->getAddress(), $list);

        $payload = [
            'secret' => $this->secret,
            'to' => $addresses($email->getTo()),
            'cc' => $addresses($email->getCc()),
            'bcc' => $addresses($email->getBcc()),
            'replyTo' => ($email->getReplyTo()[0] ?? null)?->getAddress(),
            'fromName' => $message->getEnvelope()->getSender()->getName(),
            'subject' => (string) $email->getSubject(),
            'text' => $email->getTextBody(),
            'html' => $email->getHtmlBody(),
            'attachments' => array_map(fn ($part): array => [
                'name' => $part->getFilename() ?? 'attachment',
                'type' => $part->getMediaType().'/'.$part->getMediaSubtype(),
                'content' => base64_encode($part->getBody()),
            ], $email->getAttachments()),
        ];

        try {
            // Apps Script answers with a redirect to the script's output, which the client follows.
            $response = Http::acceptJson()->timeout($this->timeout)->post($this->url, $payload);
        } catch (Throwable $exception) {
            throw new TransportException('Could not reach the Gmail relay: '.$exception->getMessage(), 0, $exception);
        }

        if ($response->json('ok') !== true) {
            throw new TransportException(sprintf(
                'The Gmail relay did not send the email (HTTP %d): %s',
                $response->status(),
                $response->json('error') ?? 'unexpected response; check the web app URL and that access is set to "Anyone"',
            ));
        }
    }

    public function __toString(): string
    {
        return 'gmail+script://script.google.com';
    }
}
