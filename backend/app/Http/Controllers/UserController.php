<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');

        return response()->json(User::query()->orderBy('name')->get());
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');

        $data = $request->validate([
            'first_name' => ['nullable', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'birthdate' => ['nullable', 'date', 'before_or_equal:'.now()->subYears(18)->toDateString()],
            'barangay_id' => ['nullable', 'integer', 'exists:barangays,id'],
            'role' => ['required', Rule::in(['admin', 'head', 'leader'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'password' => ['nullable', 'confirmed', Password::min(8)],
        ]);

        if ($data['role'] === 'leader' && ! $data['barangay_id']) {
            abort(422, 'A barangay is required for a Barangay Leader.');
        }
        if ($data['role'] !== 'leader') {
            $data['barangay_id'] = null;
        }
        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        Role::findOrCreate($data['role'], 'web');
        $user->update($data);
        $user->syncRoles([$data['role']]);

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can manage users.');
        abort_if($request->user()->id === $user->id, 422, 'You cannot delete your own account.');

        $user->delete();

        return response()->json(status: 204);
    }
}
