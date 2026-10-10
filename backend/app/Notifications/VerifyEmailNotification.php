<?php

namespace App\Notifications;

use App\Notifications\Concerns\BuildsBrandedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class VerifyEmailNotification extends Notification
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
        $hours = intdiv((int) config('auth.verification.expire'), 60);

        return $this->brandedMail(
            $notifiable,
            subject: 'Verify your Bulan SeniorCare email address',
            heading: 'Verify your email address',
            intro: 'A Bulan SeniorCare account has been created for you. Click the button below to confirm this email address, then log in with the password the Office for Senior Citizens Affairs gave you.',
            notice: new HtmlString('This link will expire in <strong>'.$hours.' hours</strong>. If you were not expecting this account, you can safely ignore this email.'),
            preheader: 'Confirm your email address to start using Bulan SeniorCare.',
            actionText: 'Verify email address',
            url: $this->url,
        );
    }
}
