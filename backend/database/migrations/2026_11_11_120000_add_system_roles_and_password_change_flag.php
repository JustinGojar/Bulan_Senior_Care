<?php

use App\Support\RolePermissions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'must_change_password')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->boolean('must_change_password')->default(false);
            });
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        RolePermissions::grantSystemDefaults();
    }

    public function down(): void
    {
        // The column is now owned by 2026_10_10_125000, before BSCA accounts are seeded.
    }
};
