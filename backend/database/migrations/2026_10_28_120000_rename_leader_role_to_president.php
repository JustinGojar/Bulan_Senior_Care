<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /** Barangay accounts are now called BSCA Presidents, so the "leader" role becomes "president". */
    public function up(): void
    {
        $this->renameRole('leader', 'president');
    }

    public function down(): void
    {
        $this->renameRole('president', 'leader');
    }

    private function renameRole(string $from, string $to): void
    {
        DB::table('users')->where('role', $from)->update(['role' => $to]);
        Schema::table('users', function (Blueprint $table) use ($to) {
            $table->string('role')->default($to)->change();
        });

        $old = DB::table('roles')->where('name', $from)->where('guard_name', 'web')->first();
        if ($old) {
            $new = DB::table('roles')->where('name', $to)->where('guard_name', 'web')->first();
            if (! $new) {
                DB::table('roles')->where('id', $old->id)->update(['name' => $to, 'updated_at' => now()]);
            } else {
                // Both exist (e.g. the default permissions were granted under the new name):
                // keep the old role's accounts and permissions on the new one.
                foreach (DB::table('model_has_roles')->where('role_id', $old->id)->get() as $row) {
                    DB::table('model_has_roles')->updateOrInsert(
                        ['role_id' => $new->id, 'model_type' => $row->model_type, 'model_id' => $row->model_id],
                    );
                }
                DB::table('role_has_permissions')->where('role_id', $new->id)->delete();
                foreach (DB::table('role_has_permissions')->where('role_id', $old->id)->pluck('permission_id') as $permissionId) {
                    DB::table('role_has_permissions')->insert(['role_id' => $new->id, 'permission_id' => $permissionId]);
                }
                DB::table('model_has_roles')->where('role_id', $old->id)->delete();
                DB::table('role_has_permissions')->where('role_id', $old->id)->delete();
                DB::table('roles')->where('id', $old->id)->delete();
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
