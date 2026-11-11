<?php

namespace App\Http\Requests;

use App\Support\RolePermissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListManagedUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && RolePermissions::allowsSystem($this->user(), 'users.view');
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', Rule::in(array_keys(RolePermissions::SYSTEM_ROLES))],
            'status' => ['nullable', Rule::in(['active', 'pending', 'inactive'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
