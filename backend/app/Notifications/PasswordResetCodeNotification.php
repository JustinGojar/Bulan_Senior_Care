<?php

namespace App\Notifications;

use App\Notifications\Concerns\BuildsBrandedMail;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class PasswordResetCodeNotification extends Notification
{
    use BuildsBrandedMail, Queueable;

    public function __construct(public readonly string $code)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $minutes = (int) config('auth.passwords.users.code_expire');
        $expires = $minutes.' '.($minutes === 1 ? 'minute' : 'minutes');

        return $this->brandedMail(
            $notifiable,
            subject: 'Your Bulan SeniorCare password reset code',
            heading: 'Reset your password',
            intro: 'We received a request to reset the password for your Bulan SeniorCare account. Enter this code on the reset page to continue.',
            notice: new HtmlString('This code will expire in <strong>'.$expires.'</strong>. Never share it with anyone. If you did not request a password reset, you can safely ignore this email &mdash; your password will not change.'),
            preheader: 'Your password reset code is '.$this->code.'. It expires in '.$expires.'.',
            code: $this->code,
        );
    }
}
