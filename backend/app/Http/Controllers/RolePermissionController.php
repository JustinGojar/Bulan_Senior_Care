<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Support\RolePermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

/** Admin Settings > Roles & Permissions: what the Head and the barangay leaders may do. */
class RolePermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage roles and permissions.');

        return response()->json($this->state());
    }

    public function update(Request $request, string $role): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage roles and permissions.');
        abort_unless(in_array($role, RolePermissions::MANAGED_ROLES, true), 404);
        $data = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(array_keys(RolePermissions::PERMISSIONS))],
        ]);

        $before = RolePermissions::granted($role);
        RolePermissions::sync($role, $data['permissions']);
        AuditLog::record($request->user(), 'updated_permissions', Role::findByName($role, RolePermissions::GUARD), ['permissions' => $before], ['permissions' => RolePermissions::granted($role)]);

        return response()->json($this->state());
    }

    private function state(): array
    {
        return [
            'permissions' => collect(RolePermissions::PERMISSIONS)
                ->map(fn (array $permission, string $key) => ['key' => $key, ...$permission])
                ->values(),
            'roles' => collect(RolePermissions::MANAGED_ROLES)
                ->mapWithKeys(fn (string $role) => [$role => RolePermissions::granted($role)]),
        ];
    }
}
