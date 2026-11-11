<?php

namespace App\Http\Requests;

use App\Support\RolePermissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSystemRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'roles' => ['required', 'array'],
            'roles.*' => ['required', 'array'],
            'roles.admin' => ['prohibited'],
            'roles.head' => ['sometimes', 'array'],
            'roles.encoder' => ['sometimes', 'array'],
            'roles.viewer' => ['sometimes', 'array'],
            'roles.president' => ['sometimes', 'array'],
            'roles.*.*' => ['string', Rule::in(array_keys(RolePermissions::SYSTEM_PERMISSIONS))],
        ];
    }
}
