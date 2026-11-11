<?php

namespace App\Http\Resources;

use App\Support\RolePermissions;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SystemRolePermissionsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'permissions' => collect(RolePermissions::SYSTEM_PERMISSIONS)
                ->map(fn (array $permission, string $key) => ['key' => $key, ...$permission])
                ->values(),
            'roles' => collect(RolePermissions::SYSTEM_ROLES)
                ->mapWithKeys(fn (string $label, string $role) => [
                    $role => [
                        'label' => $label,
                        'permissions' => RolePermissions::systemGranted($role),
                        'locked' => $role === 'admin',
                    ],
                ]),
        ];
    }
}
