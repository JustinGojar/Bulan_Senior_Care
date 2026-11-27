<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PasswordByteLength implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Bcrypt silently truncates after 72 bytes, including multi-byte characters.
        if (is_string($value) && strlen($value) > 72) {
            $fail('The password must not exceed 72 bytes. Use a shorter passphrase.');
        }
    }
}
