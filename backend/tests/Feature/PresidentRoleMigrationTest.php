<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PresidentRoleMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_existing_leader_accounts_and_permissions_become_president(): void
    {
        // An older database: accounts, their Spatie role and its permissions are still "leader".
        Role::where('name', 'president')->delete();
        $leaderRole = Role::findOrCreate('leader', 'web');
        $leaderRole->syncPermissions([Permission::findOrCreate('request benefits', 'web')]);
        $user = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        DB::table('users')->where('id', $user->id)->update(['role' => 'leader']);
        $user->assignRole('leader');

        (require database_path('migrations/2026_10_28_120000_rename_leader_role_to_president.php'))->up();

        $this->assertSame('president', DB::table('users')->where('id', $user->id)->value('role'));
        $this->assertFalse(Role::where('name', 'leader')->exists());
        $president = Role::findByName('president', 'web');
        $this->assertSame(['request benefits'], $president->permissions->pluck('name')->all());
        $this->assertTrue($user->fresh()->hasRole('president'));
    }

    public function test_new_accounts_default_to_president(): void
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'New', 'email' => 'new@example.test', 'password' => 'x',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->assertSame('president', DB::table('users')->where('id', $id)->value('role'));
    }
}
