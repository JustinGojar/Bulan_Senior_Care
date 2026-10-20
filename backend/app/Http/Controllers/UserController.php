<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\PhotoBackup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * The only user fields the account screens need. Listing them keeps secrets and internal
     * columns out of responses even if new ones are added to the table later.
     */
    private const VISIBLE_FIELDS = [
        'id', 'name', 'first_name', 'middle_name', 'last_name', 'email', 'role', 'status',
        'barangay_id', 'contact_number', 'birthdate', 'profile_photo_path', 'email_verified_at',
    ];

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');

        return response()->json(User::query()->orderBy('name')->get(self::VISIBLE_FIELDS));
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
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], [
            'contact_number.regex' => 'Enter an 11-digit mobile number starting with 09.',
            'role.in' => 'Admin accounts cannot be created.',
        ]);

        if ($data['role'] === 'leader' && empty($data['barangay_id'])) {
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
        unset($data['profile_photo']);
        if ($request->hasFile('profile_photo')) {
            $data['profile_photo_path'] = PhotoBackup::store($request->file('profile_photo'), 'profile-photos');
        }

        Role::findOrCreate($data['role'], 'web');

        $user = User::create($data);
        $user->syncRoles([$data['role']]);
        $verificationSent = $user->trySendEmailVerification();

        return response()->json(['user' => $user->fresh()->setVisible(self::VISIBLE_FIELDS), 'verification_email_sent' => $verificationSent], 201);
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
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_profile_photo' => ['nullable', 'boolean'],
        ], [
            'contact_number.regex' => 'Enter an 11-digit mobile number starting with 09.',
            'role.in' => 'Only existing Admin accounts can have the Admin role.',
        ]);

        if ($request->user()->is($user) && ($data['role'] !== 'admin' || $data['status'] !== 'active')) {
            abort(422, 'You cannot remove access from your own administrator account.');
        }

        if ($data['role'] === 'leader' && empty($data['barangay_id'])) {
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

        $oldPhotoPath = $user->profile_photo_path;
        if ($request->hasFile('profile_photo')) {
            $data['profile_photo_path'] = PhotoBackup::store($request->file('profile_photo'), 'profile-photos');
        } elseif ($request->boolean('remove_profile_photo')) {
            $data['profile_photo_path'] = null;
        }
        unset($data['profile_photo'], $data['remove_profile_photo']);

        Role::findOrCreate($data['role'], 'web');
        $user->fill($data);
        $emailChanged = $user->isDirty('email');
        $user->save();
        if ($emailChanged) {
            $user->requireEmailReverification();
        }
        if (array_key_exists('profile_photo_path', $data)) {
            PhotoBackup::delete($oldPhotoPath);
        }
        $user->syncRoles([$data['role']]);
        if (isset($data['password'])) {
            // A password set by an admin signs the user out everywhere.
            $user->tokens()->delete();
        }

        return response()->json($user->fresh()->setVisible(self::VISIBLE_FIELDS));
    }

    /** Deactivates or reactivates an account. A deactivated user is signed out and cannot log in. */
    public function updateStatus(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'inactive'])]]);
        abort_if($request->user()->is($user) && $data['status'] !== 'active', 422, 'You cannot deactivate your own account.');

        $before = ['status' => $user->status];
        $user->forceFill(['status' => $data['status']])->save();
        if ($data['status'] === 'inactive') {
            $user->tokens()->delete();
        }
        AuditLog::record($request->user(), $data['status'] === 'active' ? 'activated' : 'deactivated', $user, $before, ['status' => $user->status]);

        return response()->json($user->fresh()->setVisible(self::VISIBLE_FIELDS));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');
        abort_if($request->user()->id === $user->id, 422, 'You cannot delete your own account.');

        $user->delete();

        return response()->json(status: 204);
    }
}
