<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CheckSecurity extends Command
{
    protected $signature = 'security:check';

    protected $description = 'Check production security configuration without printing secrets or connecting to the database';

    public function handle(): int
    {
        // Resolves DB_URL overrides without opening a PDO connection.
        $database = DB::connection()->getConfig();
        $checks = [
            'APP_ENV is production' => app()->environment('production'),
            'Debug output is disabled' => ! config('app.debug'),
            'APP_KEY is configured' => filled(config('app.key')),
            'APP_URL uses HTTPS' => parse_url(config('app.url'), PHP_URL_SCHEME) === 'https',
            'FRONTEND_URL uses HTTPS' => parse_url(config('app.frontend_url'), PHP_URL_SCHEME) === 'https',
            'Rate limits use persistent storage' => ! in_array(config('cache.default'), ['array', 'null'], true),
            'Trusted proxies are explicitly restricted' => ! array_intersect((array) config('trustedproxy.proxies'), ['*', '**', '0.0.0.0/0', '::/0', 'REMOTE_ADDR']),
            'Passwords use bcrypt with cost >= 12 or Argon2id' => config('hashing.driver') === 'argon2id'
                || (config('hashing.driver') === 'bcrypt' && (int) config('hashing.bcrypt.rounds') >= 12),
        ];
        if (in_array($database['driver'], ['mysql', 'mariadb', 'pgsql', 'sqlsrv'], true)) {
            $checks['Database account is not a default superuser'] = ! in_array(strtolower($database['username'] ?? ''), ['', 'root', 'postgres', 'sa'], true);
            $checks['Database password is configured'] = filled($database['password'] ?? null);
        }
        foreach ($checks as $label => $passed) {
            $this->line(($passed ? 'PASS' : 'FAIL').' '.$label);
        }
        $this->comment('Also verify database grants, private networking/TLS, HTTPS headers, backup access and secret rotation on the deployed host.');

        return in_array(false, $checks, true) ? self::FAILURE : self::SUCCESS;
    }
}
