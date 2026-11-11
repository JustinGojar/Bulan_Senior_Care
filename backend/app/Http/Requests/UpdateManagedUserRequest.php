<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateManagedUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        $user = $this->route('user');
        $user = $user instanceof User ? $user : User::find($user);
        $roles = ['head', 'president', 'encoder', 'viewer'];
        if ($user?->role === 'admin') {
            $roles[] = 'admin';
        }

        return [
            'first_name' => ['nullable', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'contact_number' => ['nullable', 'regex:/^09\d{9}$/'],
            'birthdate' => ['nullable', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'barangay_id' => ['nullable', 'integer', 'exists:barangays,id'],
            'role' => ['required', Rule::in($roles)],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_profile_photo' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Enter an 11-digit mobile number starting with 09.',
            'role.in' => 'Only existing Super Admin accounts can keep the Super Admin role.',
        ];
    }
}
