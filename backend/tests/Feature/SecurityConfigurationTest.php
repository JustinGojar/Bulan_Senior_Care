<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SecurityConfigurationTest extends TestCase
{
    public function test_security_check_detects_unsafe_db_url_overrides_without_connecting(): void
    {
        config(['database.default' => 'mysql', 'database.connections.mysql.url' => 'mysql://root:@127.0.0.1/example']);
        DB::purge('mysql');
        $this->artisan('security:check')
            ->expectsOutput('FAIL Database account is not a default superuser')
            ->expectsOutput('FAIL Database password is configured')
            ->assertExitCode(1);
    }

    public function test_production_demo_seeder_refuses_to_run(): void
    {
        $this->app['env'] = 'production';
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Demo seeding is disabled in production');
        (new \Database\Seeders\DatabaseSeeder)->run();
    }
}
