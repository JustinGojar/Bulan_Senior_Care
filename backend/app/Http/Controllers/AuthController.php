<?php

namespace App\Http\Controllers;

use App\Http\Middleware\AuthenticateFromCookie;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\User;
use App\Support\PhotoBackup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
            'contact_number' => ['required', 'string', 'max:30'],
            'birthdate' => ['required', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'barangay_id' => ['required', 'integer', 'exists:barangays,id'],
            'password' => [
                'required',
                'confirmed',
                Password::defaults(),
            ],
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

        return response()->json(['user' => $user->load('roles')], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'accepted_terms' => ['accepted'],
            'terms_version' => ['required', 'string', 'max:20'],
        ], [
            'accepted_terms.accepted' => 'You must agree to the Terms and Conditions to sign in.',
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
        $previousTermsVersion = $user->terms_version;
        $user->forceFill([
            'last_login' => now(),
            'terms_version' => $credentials['terms_version'],
            'terms_accepted_at' => now(),
        ])->save();
        // The user agrees on every sign-in; the audit log keeps the first agreement to each version.
        if ($previousTermsVersion !== $credentials['terms_version']) {
            AuditLog::record(
                $user,
                'accepted_terms',
                $user,
                $previousTermsVersion === null ? null : ['terms_version' => $previousTermsVersion],
                ['terms_version' => $credentials['terms_version'], 'ip_address' => $request->ip()],
            );
        }
        $user->tokens()->delete();
        $token = $user->createToken('bulan-seniorcare')->plainTextToken;

        // The token goes in an HttpOnly cookie, never the body, so page scripts cannot read it.
        return response()->json([
            'user' => $user->load('roles'),
            'session' => self::sessionLimits(),
        ])->withCookie(AuthenticateFromCookie::issue($request, $token));
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

        try {
            $status = PasswordBroker::sendResetLink(['email' => $data['email']]);
        } catch (TransportExceptionInterface $exception) {
            report($exception);

            // The token was stored before sending failed; drop it so an immediate retry
            // is not silently throttled while reporting the link as sent.
            $user = PasswordBroker::getUser(['email' => $data['email']]);
            if ($user) {
                PasswordBroker::deleteToken($user);
            }

            return response()->json([
                'message' => 'We could not send the reset email right now. Please try again later.',
            ], 503);
        }

        logger()->info('Password reset link request processed.', ['status' => $status]);

        return response()->json([
            'message' => 'If an account exists for that email address, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
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
            return response()->json(['message' => __($status)], 422);
        }

        return response()->json(['message' => 'Your password has been reset. You can now log in.']);
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
