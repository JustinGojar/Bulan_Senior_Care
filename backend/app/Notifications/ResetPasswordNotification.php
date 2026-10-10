<?php

namespace App\Notifications;

use App\Notifications\Concerns\BuildsBrandedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class ResetPasswordNotification extends Notification
{
    use BuildsBrandedMail, Queueable;

    public function __construct(private readonly string $url)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $expires = (int) config('auth.passwords.users.expire');

        return $this->brandedMail(
            $notifiable,
            subject: 'Reset your Bulan SeniorCare password',
            heading: 'Reset your password',
            intro: 'We received a request to reset the password for your Bulan SeniorCare account. Click the button below to choose a new password.',
            actionText: 'Reset password',
            url: $this->url,
            notice: new HtmlString('This link will expire in <strong>'.$expires.' minutes</strong>. If you did not request a password reset, you can safely ignore this email &mdash; your password will not change.'),
            preheader: 'Use this link to reset your Bulan SeniorCare password. It expires in '.$expires.' minutes.',
        );
    }
}
