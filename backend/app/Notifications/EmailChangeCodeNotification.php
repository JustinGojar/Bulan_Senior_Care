<?php

namespace App\Notifications;

use App\Notifications\Concerns\BuildsBrandedMail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\HtmlString;

class EmailChangeCodeNotification extends Notification
{
    use BuildsBrandedMail;

    public function __construct(public readonly string $code) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->brandedMail(
            $notifiable,
            subject: 'Your Bulan SeniorCare email change code',
            heading: 'Verify your new email address',
            intro: 'Enter this code in Edit Profile to confirm your new email address.',
            notice: new HtmlString('This code expires in <strong>10 minutes</strong>. Never share it. If you did not request this change, ignore this email. Your account email has not changed.'),
            preheader: 'Confirm your email change with the code inside.',
            code: $this->code,
        );
    }
}
