<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ManagedUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status,
            'barangay_id' => $this->barangay_id,
            'contact_number' => $this->contact_number,
            'birthdate' => $this->birthdate?->toDateString(),
            'profile_photo_path' => $this->profile_photo_path,
            'email_verified_at' => $this->email_verified_at,
            'last_login' => $this->last_login,
            'must_change_password' => (bool) $this->must_change_password,
        ];
    }
}
