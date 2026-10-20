<?php

use App\Support\RolePermissions;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /** The Head and leaders start with every permission of their role; the Admin can remove them. */
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        RolePermissions::grantDefaults();
    }

    public function down(): void
    {
        //
    }
};
