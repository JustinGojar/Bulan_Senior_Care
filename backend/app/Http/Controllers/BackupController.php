<?php

namespace App\Http\Controllers;

use App\Http\Middleware\AuthenticateFromCookie;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\DatabaseBackup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use UnexpectedValueException;

class BackupController extends Controller
{
    /** Largest backup the portal accepts, in kilobytes. Bigger ones restore with `php artisan backup:restore`. */
    private const MAX_UPLOAD_KB = 128 * 1024;

    /**
     * Streams a JSON backup of every application table, so a large registry never has to fit
     * in memory at once.
     */
    public function store(Request $request): StreamedResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can create backups.');

        $tables = DatabaseBackup::tables();
        $createdAt = now();

        AuditLog::record($request->user(), 'backup_created', $request->user(), afterValue: ['tables' => count($tables)]);

        return response()->streamDownload(
            fn () => DatabaseBackup::write($tables, $createdAt->toIso8601String()),
            'bulan-seniorcare-backup-'.$createdAt->format('Ymd-His').'.json',
            ['Content-Type' => 'application/json', 'Cache-Control' => 'no-store'],
        );
    }

    /**
     * Replaces the system's data with an uploaded backup. Every account is signed out, the
     * Admin who restored included, so everyone signs in again against the restored accounts.
     */
    public function restore(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403, 'Only Admin can restore backups.');

        $request->validate([
            'backup' => ['required', 'file', 'max:'.self::MAX_UPLOAD_KB],
            'confirmation' => ['required', 'in:RESTORE'],
        ], [
            'backup.max' => 'The backup is larger than 128 MB. Restore it on the server with php artisan backup:restore.',
            'confirmation.in' => 'Confirm the restore to continue.',
        ]);

        $actorId = $request->user()->id;
        set_time_limit(0);
        try {
            $summary = DatabaseBackup::restore($request->file('backup')->getRealPath());
        } catch (UnexpectedValueException $exception) {
            abort(422, $exception->getMessage());
        }

        // The audit log was replaced too; the restore is recorded if the Admin is still in it.
        if ($actor = User::find($actorId)) {
            AuditLog::record($actor, 'backup_restored', $actor, afterValue: [
                'backup_created_at' => $summary['created_at'],
                'tables' => count($summary['tables']),
            ]);
        }

        return response()->json([
            'message' => 'The backup was restored. Please sign in again.',
            'backup_created_at' => $summary['created_at'],
            'tables' => $summary['tables'],
            'skipped_tables' => $summary['skipped_tables'],
        ])->withCookie(AuthenticateFromCookie::forget($request));
    }
}
