<?php

namespace App\Notifications\Concerns;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\HtmlString;

trait BuildsBrandedMail
{
    /**
     * An email in the Bulan Senior Care layout (logo header, then a button or a code, then a notice box).
     * Pass either $actionText and $url for a button, or $code for a one-time code.
     */
    protected function brandedMail(
        object $notifiable,
        string $subject,
        string $heading,
        string $intro,
        HtmlString $notice,
        string $preheader,
        ?string $actionText = null,
        ?string $url = null,
        ?string $code = null,
    ): MailMessage {
        $message = (new MailMessage())
            ->subject($subject)
            ->greeting('Hello '.$notifiable->name.',')
            ->line($intro);
        if ($url !== null) {
            $message->action((string) $actionText, $url);
        }

        return $message
            ->line(strip_tags((string) $notice))
            ->view(
                ['html' => 'emails.branded', 'text' => 'emails.branded-text'],
                [
                    'name' => $notifiable->name,
                    'heading' => $heading,
                    'intro' => $intro,
                    'actionText' => $actionText,
                    'url' => $url,
                    'code' => $code,
                    'notice' => $notice,
                    'preheader' => $preheader,
                    // Absolute URL: email clients only load images from public addresses.
                    'logoUrl' => rtrim((string) config('app.frontend_url'), '/').'/email-logo.png',
                ],
            );
    }
}
