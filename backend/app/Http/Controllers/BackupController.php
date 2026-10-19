<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    /**
     * Tables left out of a backup: sign-in secrets and short-lived framework state that a
     * restore should never bring back.
     */
    private const EXCLUDED_TABLES = [
        'cache',
        'cache_locks',
        'failed_jobs',
        'job_batches',
        'jobs',
        'password_reset_tokens',
        'personal_access_tokens',
        'sessions',
    ];

    /** Columns left out of a table's rows, by table. */
    private const EXCLUDED_COLUMNS = [
        'users' => ['remember_token'],
    ];

    /**
     * Streams a JSON backup of every application table, so a large registry never has to fit
     * in memory at once.
     */
    public function store(Request $request): StreamedResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can create backups.');

        $tables = collect(Schema::getTables())
            ->pluck('name')
            ->reject(fn (string $table) => in_array($table, self::EXCLUDED_TABLES, true) || str_starts_with($table, 'sqlite_'))
            ->sort()
            ->values()
            ->all();
        $createdAt = now();

        AuditLog::record($request->user(), 'backup_created', $request->user(), afterValue: ['tables' => count($tables)]);

        return response()->streamDownload(function () use ($tables, $createdAt) {
            echo '{"app":'.json_encode(config('app.name')).',"created_at":'.json_encode($createdAt->toIso8601String()).',"tables":{';
            foreach ($tables as $index => $table) {
                echo ($index > 0 ? ',' : '').json_encode($table).':[';
                $excluded = array_flip(self::EXCLUDED_COLUMNS[$table] ?? []);
                $first = true;
                foreach (DB::table($table)->cursor() as $row) {
                    echo ($first ? '' : ',').json_encode(array_diff_key((array) $row, $excluded), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
                    $first = false;
                }
                echo ']';
            }
            echo '}}';
        }, 'bulan-seniorcare-backup-'.$createdAt->format('Ymd-His').'.json', [
            'Content-Type' => 'application/json',
            'Cache-Control' => 'no-store',
        ]);
    }
}
