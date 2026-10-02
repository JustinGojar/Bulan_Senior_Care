<?php

namespace Database\Seeders;

use App\Models\Benefit;
use Illuminate\Database\Seeder;

class BenefitSeeder extends Seeder
{
    public function run(): void
    {
        $programs = [
            ['benefit_name' => 'Social Pension', 'benefit_type' => 'social_pension', 'min_age' => 60, 'max_age' => null, 'amount' => 3000, 'funding_source' => 'national', 'schedule' => 'quarterly'],
            ['benefit_name' => 'Octogenarian Grant', 'benefit_type' => 'octogenarian', 'min_age' => 80, 'max_age' => 85, 'amount' => 10000, 'funding_source' => 'national', 'schedule' => 'one_time'],
            ['benefit_name' => 'Nonagenarian Grant', 'benefit_type' => 'nonagenarian', 'min_age' => 90, 'max_age' => 95, 'amount' => 10000, 'funding_source' => 'national', 'schedule' => 'one_time'],
            ['benefit_name' => 'Centenarian Award', 'benefit_type' => 'centenarian', 'min_age' => 100, 'max_age' => 100, 'amount' => 100000, 'funding_source' => 'national', 'schedule' => 'one_time'],
            ['benefit_name' => 'Precentenarian Program', 'benefit_type' => 'precentenarian', 'min_age' => 85, 'max_age' => 99, 'amount' => null, 'funding_source' => 'municipal', 'schedule' => 'conditional'],
            ['benefit_name' => 'Provincial Program', 'benefit_type' => 'provincial', 'min_age' => 80, 'max_age' => 99, 'amount' => 5000, 'funding_source' => 'provincial', 'schedule' => 'conditional'],
        ];
        foreach ($programs as $program) {
            Benefit::updateOrCreate(['benefit_type' => $program['benefit_type']], $program);
        }
    }
}
