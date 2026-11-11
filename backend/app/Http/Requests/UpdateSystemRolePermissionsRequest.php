<?php

namespace App\Http\Requests;

use App\Support\RolePermissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSystemRolePermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin'
            && in_array($this->route('role'), ['head', 'encoder', 'viewer', 'president'], true);
    }

    public function rules(): array
    {
        return [
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(array_keys(RolePermissions::SYSTEM_PERMISSIONS))],
        ];
    }
}
