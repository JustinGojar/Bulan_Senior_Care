<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    public function sendPasswordResetNotification($token): void
    {
        $url = rtrim(config('app.frontend_url'), '/') . '/reset-password?token=' . urlencode($token) . '&email=' . urlencode($this->getEmailForPasswordReset());
        $this->notify(new ResetPasswordNotification($url));
    }

    public function sendEmailVerificationNotification(): void
    {
        $expires = now()->addMinutes((int) config('auth.verification.expire'))->getTimestamp();
        $hash = sha1($this->getEmailForVerification());
        $url = rtrim(config('app.frontend_url'), '/').'/verify-email?'.http_build_query([
            'id' => $this->id,
            'hash' => $hash,
            'expires' => $expires,
            'signature' => self::emailVerificationSignature($this->id, $hash, $expires),
        ]);
        $this->notify(new VerifyEmailNotification($url));
    }

    /**
     * Signs the link ourselves rather than with URL::signedRoute, because the link opens the
     * portal and reaches the API through Vercel's proxy, so the API never sees the signed URL.
     */
    public static function emailVerificationSignature(int $id, string $hash, int $expires): string
    {
        return hash_hmac('sha256', "verify-email|{$id}|{$hash}|{$expires}", (string) config('app.key'));
    }

    /**
     * Sends the verification email, reporting rather than throwing when the mail service fails.
     */
    public function trySendEmailVerification(): bool
    {
        try {
            $this->sendEmailVerificationNotification();

            return true;
        } catch (TransportExceptionInterface $exception) {
            report($exception);

            return false;
        }
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'password',
        'role',
        'barangay_id',
        'contact_number',
        'address',
        'birthdate',
        'profile_photo_path',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login' => 'datetime',
            'birthdate' => 'date:Y-m-d',
        ];
    }
}
