<?php

namespace App\Http\Controllers;

use App\Http\Middleware\AuthenticateFromCookie;
use App\Models\Barangay;
use App\Models\User;
use App\Notifications\PasswordResetCodeNotification;
use App\Support\PhotoBackup;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class AuthController extends Controller
{
    private const RESET_CODE_MAX_ATTEMPTS = 5;

    public function barangays(Request $request): JsonResponse
    {
        // Saving a barangay clears this entry.
        return response()->json(Cache::remember(Barangay::LIST_CACHE_KEY, now()->addHour(), fn () => Barangay::query()->orderBy('barangay_name')->get(['id', 'barangay_name'])->toArray()));
    }

    public function createBarangayLeader(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can create Barangay Leader accounts.');
        Role::findOrCreate('leader', 'web');

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'contact_number' => ['required', 'regex:/^09\d{9}$/'],
            'birthdate' => ['required', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'barangay_id' => ['required', 'integer', 'exists:barangays,id'],
            'password' => [
                'required',
                'confirmed',
                Password::defaults(),
            ],
        ], [
            'contact_number.regex' => 'Enter an 11-digit mobile number starting with 09.',
        ]);

        $user = User::create([
            'name' => trim(implode(' ', array_filter([$data['first_name'], $data['middle_name'] ?? null, $data['last_name']]))),
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'contact_number' => $data['contact_number'],
            'birthdate' => $data['birthdate'],
            'barangay_id' => $data['barangay_id'],
            'password' => $data['password'],
            'role' => 'leader',
            'status' => 'active',
        ]);
        $user->syncRoles(['leader']);
        $verificationSent = $user->trySendEmailVerification();

        return response()->json(['user' => $user->load('roles'), 'verification_email_sent' => $verificationSent], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);
        $throttleKey = Str::transliterate(Str::lower($credentials['email']).'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return response()->json([
                'message' => 'Too many login attempts. Please try again in '.RateLimiter::availableIn($throttleKey).' seconds.',
            ], 429);
        }

        $user = User::where('email', $credentials['email'])->where('status', 'active')->first();

        // Hash even for unknown emails so response time does not reveal which accounts exist.
        $passwordMatches = Hash::check($credentials['password'], $user?->password ?? self::dummyPasswordHash());
        if (! $user || ! $passwordMatches) {
            RateLimiter::hit($throttleKey, 60);

            return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
        }

        RateLimiter::clear($throttleKey);

        if (! $user->hasVerifiedEmail()) {
            return self::unverifiedLoginResponse($user);
        }

        $user->forceFill(['last_login' => now()])->save();
        $user->tokens()->delete();
        $token = $user->createToken('bulan-seniorcare')->plainTextToken;

        // The token goes in an HttpOnly cookie, never the body, so page scripts cannot read it.
        return response()->json([
            'user' => $user->load('roles'),
            'session' => self::sessionLimits(),
        ])->withCookie(AuthenticateFromCookie::issue($request, $token));
    }

    /**
     * Refuses the sign-in and emails a fresh verification link, at most once a minute.
     */
    private static function unverifiedLoginResponse(User $user): JsonResponse
    {
        $resendKey = 'verify-email:'.$user->id;
        if (RateLimiter::tooManyAttempts($resendKey, 1)) {
            $message = 'Please verify your email address before logging in. Check your inbox for the verification link we sent to '.$user->email.'.';
        } else {
            RateLimiter::hit($resendKey, 60);
            $message = $user->trySendEmailVerification()
                ? 'Please verify your email address before logging in. We sent a new verification link to '.$user->email.'.'
                : 'Please verify your email address before logging in. We could not send a new verification link right now. Please try again later.';
        }

        return response()->json(['message' => $message, 'email_unverified' => true], 403);
    }

    /**
     * Sign-in limits the portal mirrors so it can warn before signing the user out.
     * Lengths rather than timestamps, so a wrong clock on the user's device does not matter.
     */
    private static function sessionLimits(): array
    {
        $expiration = (int) config('sanctum.expiration');

        return [
            'idle_timeout_minutes' => max(0, (int) config('sanctum.idle_timeout', 0)),
            'expires_in_seconds' => $expiration > 0 ? $expiration * 60 : null,
        ];
    }

    private static function dummyPasswordHash(): string
    {
        static $hash;

        return $hash ??= Hash::make(Str::random(32));
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $user = User::where('email', $data['email'])->first();

        // A code sent in the last minute stays valid, so repeat requests do not flood the inbox.
        if ($user && ! self::resetCodeRecentlySent($user->email)) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            self::resetTokens()->updateOrInsert(
                ['email' => $user->email],
                ['token' => Hash::make($code), 'created_at' => now()],
            );
            RateLimiter::clear(self::resetCodeAttemptsKey($user->email));

            try {
                $user->notify(new PasswordResetCodeNotification($code));
            } catch (TransportExceptionInterface $exception) {
                report($exception);
                // Drop the unsent code so an immediate retry sends a new one.
                self::resetTokens()->where('email', $user->email)->delete();

                return response()->json([
                    'message' => 'We could not send the verification code right now. Please try again later.',
                ], 503);
            }
        }

        return response()->json([
            'message' => 'If an account exists for that email address, we sent a 6-digit verification code to it.',
        ]);
    }

    /**
     * Swaps a correct emailed code for a one-time reset token. Five wrong codes cancel the code.
     */
    public function verifyResetCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
        ], ['code.digits' => 'Enter the 6-digit code from the email.']);

        $attemptsKey = self::resetCodeAttemptsKey($data['email']);
        if (RateLimiter::tooManyAttempts($attemptsKey, self::RESET_CODE_MAX_ATTEMPTS)) {
            return response()->json(['message' => 'Too many incorrect codes. Please request a new code.'], 429);
        }

        $record = self::resetTokens()->where('email', $data['email'])->first();
        $expired = $record && Carbon::parse($record->created_at)->addMinutes(self::resetExpiryMinutes())->isPast();
        if (! $record || $expired || ! Hash::check($data['code'], $record->token)) {
            RateLimiter::hit($attemptsKey, self::resetExpiryMinutes() * 60);
            if (RateLimiter::tooManyAttempts($attemptsKey, self::RESET_CODE_MAX_ATTEMPTS)) {
                self::resetTokens()->where('email', $data['email'])->delete();

                return response()->json(['message' => 'Too many incorrect codes. Please request a new code.'], 429);
            }

            return response()->json([
                'message' => $expired ? 'This code has expired. Please request a new code.' : 'The code you entered is incorrect.',
            ], 422);
        }

        RateLimiter::clear($attemptsKey);
        // The password broker checks this token on the final step; the code itself stops working.
        $token = Str::random(64);
        self::resetTokens()->where('email', $data['email'])->update([
            'token' => Hash::make($token),
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Code verified. You can now set a new password.', 'reset_token' => $token]);
    }

    private static function resetTokens(): Builder
    {
        return DB::table(config('auth.passwords.users.table'));
    }

    private static function resetExpiryMinutes(): int
    {
        return (int) config('auth.passwords.users.expire');
    }

    private static function resetCodeAttemptsKey(string $email): string
    {
        return 'reset-code:'.Str::lower($email);
    }

    private static function resetCodeRecentlySent(string $email): bool
    {
        $createdAt = self::resetTokens()->where('email', $email)->value('created_at');

        return $createdAt !== null && Carbon::parse($createdAt)->addMinute()->isFuture();
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            // Only the token from verifyResetCode, never the 6-digit code, which has its own attempt limit.
            'token' => ['required', 'string', 'size:64'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $status = PasswordBroker::reset(
            $data,
            function (User $user, string $password): void {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            },
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            $message = $status === PasswordBroker::INVALID_TOKEN
                ? 'Your password reset session has expired. Please request a new code.'
                : __($status);

            return response()->json(['message' => $message], 422);
        }

        return response()->json(['message' => 'Your password has been reset. You can now log in.']);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'integer'],
            'hash' => ['required', 'string'],
            'expires' => ['required', 'integer'],
            'signature' => ['required', 'string'],
        ]);

        $id = (int) $data['id'];
        $expires = (int) $data['expires'];
        $user = User::find($id);
        $valid = $user
            && hash_equals(User::emailVerificationSignature($id, $data['hash'], $expires), $data['signature'])
            && hash_equals(sha1($user->getEmailForVerification()), $data['hash']);

        if (! $valid) {
            return response()->json(['message' => 'This verification link is invalid. Log in to get a new one.'], 422);
        }
        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Your email address is already verified. You can log in.']);
        }
        if ($expires < now()->getTimestamp()) {
            return response()->json(['message' => 'This verification link has expired. Log in to get a new one.'], 422);
        }

        $user->markEmailAsVerified();

        return response()->json(['message' => 'Your email address has been verified. You can now log in.']);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out successfully.'])
            ->withCookie(AuthenticateFromCookie::forget($request));
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('roles'));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($request->user()->id)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();
        $oldPhotoPath = $user->profile_photo_path;
        if ($request->hasFile('profile_photo')) {
            $data['profile_photo_path'] = PhotoBackup::store($request->file('profile_photo'), 'profile-photos');
        }
        unset($data['profile_photo']);
        $user->update($data);

        if (isset($data['profile_photo_path'])) {
            PhotoBackup::delete($oldPhotoPath);
        }

        return response()->json($user->fresh()->load('roles'));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $request->user()->update(['password' => $data['password']]);
        $request->user()->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
