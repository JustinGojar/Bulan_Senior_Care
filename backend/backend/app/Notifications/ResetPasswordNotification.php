<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $url)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject('Reset your Bulan SeniorCare password')
            ->greeting('Hello '.$notifiable->name.',')
            ->line('We received a request to reset your Bulan SeniorCare password.')
            ->action('Reset password', $this->url)
            ->line('This link will expire in '.config('auth.passwords.users.expire').' minutes. If you did not request this, no action is needed.');
    }
}
