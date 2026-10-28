<?php

namespace App\Support;

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * What the Head and the barangay presidents may do, which the Admin turns on or off per role in
 * Settings. Admin always has every permission. Each permission is checked by the API.
 */
class RolePermissions
{
    public const GUARD = 'web';

    /** Every permission the Admin can manage, with the roles it applies to. */
    public const PERMISSIONS = [
        'export reports' => [
            'label' => 'Export reports',
            'description' => 'Print and download reports as PDF or Excel.',
            'roles' => ['head', 'president'],
        ],
        'approve registrations' => [
            'label' => 'Approve or reject registrations',
            'description' => 'Review pending senior registrations on Eligibility Review.',
            'roles' => ['head'],
        ],
        'manage benefit requests' => [
            'label' => 'Verify and release benefit requests',
            'description' => 'Approve, reject and record the release of presidents\' benefit requests.',
            'roles' => ['head'],
        ],
        'schedule benefit releases' => [
            'label' => 'Schedule benefit releases',
            'description' => 'Create release batches for barangays.',
            'roles' => ['head'],
        ],
        'manage announcements' => [
            'label' => 'Post announcements',
            'description' => 'Create, edit and delete announcements and events.',
            'roles' => ['head'],
        ],
        'register seniors' => [
            'label' => 'Register seniors',
            'description' => 'Add new senior citizens, one at a time or by bulk upload.',
            'roles' => ['president'],
        ],
        'request benefits' => [
            'label' => 'Request benefits',
            'description' => 'Submit benefit requests for approved seniors.',
            'roles' => ['president'],
        ],
    ];

    /** The roles whose permissions the Admin manages. */
    public const MANAGED_ROLES = ['head', 'president'];

    public static function allows(User $user, string $permission): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        if (! in_array($user->role, self::PERMISSIONS[$permission]['roles'] ?? [], true)) {
            return false;
        }

        return in_array($permission, self::granted($user->role), true);
    }

    /** The user, with the permission names their role has, for the app to show or hide actions. */
    public static function withGranted(User $user): User
    {
        return $user->setAttribute('granted_permissions', self::granted($user->role));
    }

    /** Stops the request with a 403 when the user's role lacks the permission. */
    public static function authorize(User $user, string $permission): void
    {
        abort_unless(
            self::allows($user, $permission),
            403,
            'Your role does not have permission to '.lcfirst(self::PERMISSIONS[$permission]['label']).'. Ask the Admin to enable it in Settings.',
        );
    }

    /** The permissions a role has now. */
    public static function granted(?string $role): array
    {
        if ($role === 'admin') {
            return array_keys(self::PERMISSIONS);
        }
        if (! $role) {
            return [];
        }
        $model = Role::query()->where('name', $role)->where('guard_name', self::GUARD)->first();

        return $model ? $model->permissions->pluck('name')->intersect(array_keys(self::PERMISSIONS))->values()->all() : [];
    }

    /** Sets a role's permissions, keeping only those that apply to it. */
    public static function sync(string $role, array $permissions): void
    {
        $allowed = array_keys(array_filter(self::PERMISSIONS, fn (array $permission) => in_array($role, $permission['roles'], true)));
        foreach ($allowed as $name) {
            Permission::findOrCreate($name, self::GUARD);
        }
        Role::findOrCreate($role, self::GUARD)->syncPermissions(array_values(array_intersect($permissions, $allowed)));
    }

    /** Gives every role all of its permissions; used when they are first set up. */
    public static function grantDefaults(): void
    {
        foreach (self::MANAGED_ROLES as $role) {
            self::sync($role, array_keys(self::PERMISSIONS));
        }
    }
}
