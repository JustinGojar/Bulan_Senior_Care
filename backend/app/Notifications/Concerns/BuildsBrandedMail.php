<?php

namespace App\Notifications\Concerns;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\HtmlString;

trait BuildsBrandedMail
{
    /**
     * A one-button email in the Bulan Senior Care layout (logo header, button, notice box).
     */
    protected function brandedMail(
        object $notifiable,
        string $subject,
        string $heading,
        string $intro,
        string $actionText,
        string $url,
        HtmlString $notice,
        string $preheader,
    ): MailMessage {
        return (new MailMessage())
            ->subject($subject)
            ->greeting('Hello '.$notifiable->name.',')
            ->line($intro)
            ->action($actionText, $url)
            ->line(strip_tags((string) $notice))
            ->view(
                ['html' => 'emails.branded', 'text' => 'emails.branded-text'],
                [
                    'name' => $notifiable->name,
                    'heading' => $heading,
                    'intro' => $intro,
                    'actionText' => $actionText,
                    'url' => $url,
                    'notice' => $notice,
                    'preheader' => $preheader,
                    // Absolute URL: email clients only load images from public addresses.
                    'logoUrl' => rtrim((string) config('app.frontend_url'), '/').'/email-logo.png',
                ],
            );
    }
}
