<?php

namespace App\Http\Controllers;

use App\Http\Requests\ListManagedUsersRequest;
use App\Http\Requests\StoreManagedUserRequest;
use App\Http\Requests\UpdateManagedUserRequest;
use App\Http\Requests\UpdateManagedUserStatusRequest;
use App\Http\Resources\ManagedUserResource;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\User;
use App\Support\PhotoBackup;
use App\Support\RolePermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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
        'last_login', 'must_change_password',
    ];

    public function index(ListManagedUsersRequest $request): JsonResponse
    {
        RolePermissions::authorizeSystem($request->user(), 'users.view');
        $filters = $request->validated();

        $users = User::query()
            ->select(self::VISIBLE_FIELDS)
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhereIn(
                            'barangay_id',
                            Barangay::query()
                                ->select('id')
                                ->where('barangay_name', 'like', "%{$search}%"),
                        );
                });
            })
            ->when($filters['role'] ?? null, fn ($query, string $role) => $query->where('role', $role))
            ->when($filters['status'] ?? null, function ($query, string $status): void {
                if ($status === 'pending') {
                    $query->where('status', 'active')->whereNull('email_verified_at');
                } else {
                    $query->where('status', $status);
                }
            })
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 25);

        return ManagedUserResource::collection($users)->response();
    }

    public function store(StoreManagedUserRequest $request): JsonResponse
    {
        RolePermissions::authorizeSystem($request->user(), 'users.create');
        $data = $request->validated();

        if ($data['role'] === 'president' && empty($data['barangay_id'])) {
            abort(422, 'A barangay is required for a Barangay President.');
        }

        if ($data['role'] === 'president') {
            $this->ensurePresidentBarangayAvailable((int) $data['barangay_id']);
        }

        if ($data['role'] !== 'president') {
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

        return response()->json([
            'user' => (new ManagedUserResource($user->fresh()))->resolve($request),
            'verification_email_sent' => $verificationSent,
        ], 201);
    }

    public function update(UpdateManagedUserRequest $request, User $user): JsonResponse
    {
        RolePermissions::authorizeSystem($request->user(), 'users.update');
        $data = $request->validated();

        if ($request->user()->is($user) && ($data['role'] !== 'admin' || $data['status'] !== 'active')) {
            abort(422, 'You cannot remove access from your own administrator account.');
        }
        $this->ensureSuperAdminRemains($user, $data['role'], $data['status']);

        if ($data['role'] === 'president' && empty($data['barangay_id'])) {
            abort(422, 'A barangay is required for a Barangay President.');
        }
        if ($data['role'] === 'president') {
            $this->ensurePresidentBarangayAvailable((int) $data['barangay_id'], $user);
        }
        if ($data['role'] !== 'president') {
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
        if (isset($data['password']) || $user->status === 'inactive') {
            // Revoke immediately, so reactivating an account cannot revive an old session.
            $user->tokens()->delete();
        }

        return response()->json((new ManagedUserResource($user->fresh()))->resolve($request));
    }

    private function ensurePresidentBarangayAvailable(int $barangayId, ?User $except = null): void
    {
        $exists = User::where('barangay_id', $barangayId)
            ->where('role', 'president')
            ->when($except, fn ($query) => $query->where('id', '!=', $except->id))
            ->exists();

        abort_if($exists, 422, 'A Barangay President has already been created for this barangay.');
    }

    /** Deactivates or reactivates an account. A deactivated user is signed out and cannot log in. */
    public function updateStatus(UpdateManagedUserStatusRequest $request, User $user): JsonResponse
    {
        RolePermissions::authorizeSystem($request->user(), 'users.deactivate');
        $data = $request->validated();
        abort_if($request->user()->is($user) && $data['status'] !== 'active', 422, 'You cannot deactivate your own account.');
        $this->ensureSuperAdminRemains($user, $user->role, $data['status']);

        $before = ['status' => $user->status];
        $user->forceFill(['status' => $data['status']])->save();
        if ($data['status'] === 'inactive') {
            $user->tokens()->delete();
        }
        AuditLog::record($request->user(), $data['status'] === 'active' ? 'activated' : 'deactivated', $user, $before, ['status' => $user->status]);

        return response()->json((new ManagedUserResource($user->fresh()))->resolve($request));
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        RolePermissions::authorizeSystem($request->user(), 'users.reset-password');
        $temporaryPassword = Str::password(16);

        $user->forceFill([
            'password' => Hash::make($temporaryPassword),
            'must_change_password' => true,
        ])->save();
        $user->tokens()->delete();
        AuditLog::record(
            $request->user(),
            'password_reset',
            $user,
            null,
            ['must_change_password' => true],
        );

        return response()->json([
            'message' => 'Temporary password created. It is shown only once.',
            'temporary_password' => $temporaryPassword,
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        RolePermissions::authorizeSystem($request->user(), 'users.deactivate');
        abort_if($request->user()->id === $user->id, 422, 'You cannot delete your own account.');
        $this->ensureSuperAdminRemains($user, null, null);

        AuditLog::record($request->user(), 'deleted', $user, ['status' => $user->status], null);
        $user->delete();

        return response()->json(status: 204);
    }

    private function ensureSuperAdminRemains(User $user, ?string $nextRole, ?string $nextStatus): void
    {
        if ($user->role !== 'admin' || $user->status !== 'active') {
            return;
        }
        if ($nextRole === 'admin' && $nextStatus === 'active') {
            return;
        }

        abort_if(
            User::query()->where('role', 'admin')->where('status', 'active')->count() <= 1,
            422,
            'The last active Super Admin cannot be deactivated, deleted, or changed to another role.',
        );
    }
}
