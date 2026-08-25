<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Barangay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    public function barangays(Request $request): JsonResponse
    {
        return response()->json(Barangay::query()->orderBy('barangay_name')->get(['id', 'barangay_name']));
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
            'password' => ['required', 'confirmed', Password::min(8)],
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

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => ['required', Rule::in(['admin', 'head'])],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'contact_number' => $data['contact_number'] ?? null,
            'password' => $data['password'],
            'role' => $data['role'],
            'status' => 'active',
        ]);
        $user->syncRoles([$data['role']]);

        $token = $user->createToken('bulan-seniorcare')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user->load('roles')], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::where('email', $credentials['email'])->where('status', 'active')->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 422);
        }

        $user->update(['last_login' => now()]);
        $user->tokens()->delete();
        $token = $user->createToken('bulan-seniorcare')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user->load('roles')]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        PasswordBroker::sendResetLink(['email' => $data['email']]);

        return response()->json(['message' => 'If an account exists for that email, a password reset link has been sent.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::min(8)],
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
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
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
            'profile_photo' => ['nullable', 'image', 'max:2048'],
        ]);

        $user = $request->user();
        if ($request->hasFile('profile_photo')) {
            $data['profile_photo_path'] = $request->file('profile_photo')->store('profile-photos', 'public');
        }
        unset($data['profile_photo']);
        $user->update($data);

        return response()->json($user->fresh()->load('roles'));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $request->user()->update(['password' => $data['password']]);
        $request->user()->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete();

        return response()->json(['message' => 'Password changed successfully.']);
    }
}
