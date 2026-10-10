<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');

        return response()->json(User::query()->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'name' => ['nullable', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'contact_number' => ['required', 'regex:/^09\d{9}$/'],
            'birthdate' => ['required', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'barangay_id' => ['nullable', 'integer', 'exists:barangays,id'],
            // Admin accounts cannot be created from the portal.
            'role' => ['required', Rule::in(['head', 'leader'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'password' => ['required', 'confirmed', Password::defaults()],
        ], [
            'contact_number.regex' => 'Enter an 11-digit mobile number starting with 09.',
            'role.in' => 'Admin accounts cannot be created.',
        ]);

        if ($data['role'] === 'leader' && ! $data['barangay_id']) {
            abort(422, 'A barangay is required for a Barangay Leader.');
        }

        if ($data['role'] !== 'leader') {
            $data['barangay_id'] = null;
        }

        $data['name'] = trim(implode(' ', array_filter([
            $data['first_name'],
            $data['middle_name'] ?? null,
            $data['last_name'],
        ])));
        $data['password'] = Hash::make($data['password']);

        Role::findOrCreate($data['role'], 'web');

        $user = User::create($data);
        $user->syncRoles([$data['role']]);
        $verificationSent = $user->trySendEmailVerification();

        return response()->json(['user' => $user->fresh()->load('roles'), 'verification_email_sent' => $verificationSent], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');

        $data = $request->validate([
            'first_name' => ['nullable', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'contact_number' => ['nullable', 'regex:/^09\d{9}$/'],
            'birthdate' => ['nullable', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'barangay_id' => ['nullable', 'integer', 'exists:barangays,id'],
            // An existing Admin keeps the role, but no other account can be promoted to Admin.
            'role' => ['required', Rule::in($user->role === 'admin' ? ['admin', 'head', 'leader'] : ['head', 'leader'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ], [
            'contact_number.regex' => 'Enter an 11-digit mobile number starting with 09.',
            'role.in' => 'Only existing Admin accounts can have the Admin role.',
        ]);

        if ($request->user()->is($user) && ($data['role'] !== 'admin' || $data['status'] !== 'active')) {
            abort(422, 'You cannot remove access from your own administrator account.');
        }

        if ($data['role'] === 'leader' && ! $data['barangay_id']) {
            abort(422, 'A barangay is required for a Barangay Leader.');
        }
        if ($data['role'] !== 'leader') {
            $data['barangay_id'] = null;
        }
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        Role::findOrCreate($data['role'], 'web');
        $user->update($data);
        $user->syncRoles([$data['role']]);
        if (isset($data['password'])) {
            // A password set by an admin signs the user out everywhere.
            $user->tokens()->delete();
        }

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');
        abort_if($request->user()->id === $user->id, 422, 'You cannot delete your own account.');

        $user->delete();

        return response()->json(status: 204);
    }
}
