<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->string('place_of_birth')->nullable()->after('birthdate');
            $table->text('educational_attainment')->nullable()->after('civil_status');
            $table->text('other_skills')->nullable()->after('educational_attainment');
            $table->text('family_composition')->nullable()->after('other_skills');
            $table->string('association_name')->nullable()->after('family_composition');
            $table->text('association_address')->nullable()->after('association_name');
            $table->date('association_membership_date')->nullable()->after('association_address');
            $table->string('association_position')->nullable()->after('association_membership_date');
        });
    }

    public function down(): void
    {
        Schema::table('senior_citizens', function (Blueprint $table) {
            $table->dropColumn([
                'place_of_birth',
                'educational_attainment',
                'other_skills',
                'family_composition',
                'association_name',
                'association_address',
                'association_membership_date',
                'association_position',
            ]);
        });
    }
};
