<?php

namespace App\Support;

use Generator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use UnexpectedValueException;

/**
 * Writes and restores the JSON database backup.
 *
 * Each table name and each row sits on its own line, so a backup holding many stored photos
 * is read one row at a time instead of being loaded into memory whole. The file is still
 * ordinary JSON.
 */
class DatabaseBackup
{
    public const FORMAT = 'bulan-seniorcare-backup';

    public const VERSION = 2;

    /**
     * Tables never backed up or restored: sign-in secrets and short-lived framework state.
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

    /** Backed up for reference but never restored: the schema stays as migrated. */
    private const KEPT_TABLES = ['migrations'];

    /** Columns left out of a table's rows, by table. */
    private const EXCLUDED_COLUMNS = [
        'users' => ['remember_token'],
    ];

    /** Backups from before the line-per-row layout are decoded whole, so they are capped. */
    private const LEGACY_MAX_BYTES = 32 * 1024 * 1024;

    /** Rows are inserted in batches no bigger than this, to stay under packet limits. */
    private const BATCH_MAX_BYTES = 4 * 1024 * 1024;

    /** @return list<string> */
    public static function tables(): array
    {
        return collect(Schema::getTables())
            ->pluck('name')
            ->reject(fn (string $table) => in_array($table, self::EXCLUDED_TABLES, true) || str_starts_with($table, 'sqlite_'))
            ->sort()
            ->values()
            ->all();
    }

    /**
     * Echoes the backup, for a streamed download.
     *
     * @param  list<string>  $tables
     */
    public static function write(array $tables, string $createdAt): void
    {
        echo '{"format":'.json_encode(self::FORMAT).',"version":'.self::VERSION
            .',"app":'.json_encode(config('app.name')).',"created_at":'.json_encode($createdAt).',"tables":{';
        foreach ($tables as $index => $table) {
            echo "\n".($index > 0 ? ',' : '').json_encode($table).':[';
            $excluded = array_flip(self::EXCLUDED_COLUMNS[$table] ?? []);
            $first = true;
            foreach (DB::table($table)->cursor() as $row) {
                echo "\n".($first ? '' : ',').json_encode(array_diff_key((array) $row, $excluded), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
                $first = false;
            }
            echo "\n]";
        }
        echo "\n}}\n";
    }

    /**
     * Checks a backup file without changing anything.
     *
     * @return array{created_at: ?string, tables: array<string, int>, skipped_tables: list<string>}
     *
     * @throws UnexpectedValueException when the file is not a usable backup.
     */
    public static function inspect(string $path): array
    {
        $restorable = self::restorableTables();
        $counts = [];
        $skipped = [];
        $createdAt = null;
        $hasActiveAdmin = false;

        foreach (self::entries($path) as $entry) {
            if ($entry[0] === 'header') {
                $createdAt = is_string($entry[1]['created_at'] ?? null) ? $entry[1]['created_at'] : null;
            } elseif ($entry[0] === 'table') {
                if (array_key_exists($entry[1], $counts) || in_array($entry[1], $skipped, true)) {
                    throw new UnexpectedValueException("The backup lists the table \"{$entry[1]}\" twice.");
                }
                if (array_key_exists($entry[1], $restorable)) {
                    $counts[$entry[1]] = 0;
                } else {
                    $skipped[] = $entry[1];
                }
            } elseif (array_key_exists($entry[1], $counts)) {
                [, $table, $row] = $entry;
                foreach ($row as $value) {
                    if (! is_scalar($value) && $value !== null) {
                        throw new UnexpectedValueException("A row in \"{$table}\" has a value that is not plain data.");
                    }
                }
                $counts[$table]++;
                $hasActiveAdmin = $hasActiveAdmin || ($table === 'users'
                    && ($row['role'] ?? null) === 'admin'
                    && ($row['status'] ?? null) === 'active'
                    && empty($row['deleted_at']));
            }
        }

        if (! array_key_exists('users', $counts)) {
            throw new UnexpectedValueException('The backup has no user accounts table.');
        }
        if (! $hasActiveAdmin) {
            throw new UnexpectedValueException('The backup has no active Admin account, so nobody could sign in after restoring it.');
        }

        return ['created_at' => $createdAt, 'tables' => $counts, 'skipped_tables' => $skipped];
    }

    /**
     * Replaces the data in every table the backup holds with the backup's rows, in one
     * transaction, then signs every account out. Tables the backup lacks are left as they are.
     *
     * @return array{created_at: ?string, tables: array<string, int>, skipped_tables: list<string>}
     *
     * @throws UnexpectedValueException when the file is not a usable backup.
     */
    public static function restore(string $path): array
    {
        $summary = self::inspect($path);
        $restorable = self::restorableTables();
        $tables = array_keys($summary['tables']);

        Schema::disableForeignKeyConstraints();
        try {
            DB::transaction(function () use ($path, $restorable, $tables) {
                if (DB::connection()->getDriverName() === 'sqlite') {
                    // SQLite ignores the switch above inside a transaction; deferring keeps the
                    // checks until commit, when the restored rows are complete.
                    DB::statement('PRAGMA defer_foreign_keys = ON');
                }

                // Every table is emptied before any is filled, so deleting one never cascades
                // into rows already restored in another.
                foreach ($tables as $table) {
                    DB::table($table)->delete();
                }

                $batch = [];
                $batchBytes = 0;
                $batchTable = null;
                $batchColumns = null;
                $flush = function () use (&$batch, &$batchBytes, &$batchTable) {
                    if ($batch !== []) {
                        DB::table($batchTable)->insert($batch);
                    }
                    $batch = [];
                    $batchBytes = 0;
                };

                foreach (self::entries($path) as $entry) {
                    if ($entry[0] !== 'row' || ! in_array($entry[1], $tables, true)) {
                        continue;
                    }
                    [, $table, $row, $bytes] = $entry;
                    $columns = $restorable[$table];
                    // Columns the table no longer has are dropped; ones the backup predates take their defaults.
                    $row = array_intersect_key($row, $columns);
                    if ($row === []) {
                        continue;
                    }
                    // One insert needs the same columns in every row, and SQLite allows at most
                    // 999 bound values in one statement.
                    $rowColumns = array_keys($row);
                    $maxRows = intdiv(900, count($row)) ?: 1;
                    if ($table !== $batchTable || $rowColumns !== $batchColumns || count($batch) >= $maxRows || $batchBytes + $bytes > self::BATCH_MAX_BYTES) {
                        $flush();
                        $batchTable = $table;
                        $batchColumns = $rowColumns;
                    }
                    $batch[] = $row;
                    $batchBytes += $bytes;
                }
                $flush();

                // Restored accounts sign in again with their restored passwords.
                foreach (['personal_access_tokens', 'password_reset_tokens', 'sessions'] as $secrets) {
                    if (Schema::hasTable($secrets)) {
                        DB::table($secrets)->delete();
                    }
                }
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        Cache::flush();

        return $summary;
    }

    /**
     * Current tables a backup may restore, each with its columns as keys.
     *
     * @return array<string, array<string, true>>
     */
    private static function restorableTables(): array
    {
        $tables = [];
        foreach (array_diff(self::tables(), self::KEPT_TABLES) as $table) {
            $tables[$table] = array_fill_keys(Schema::getColumnListing($table), true);
        }

        return $tables;
    }

    /**
     * Reads a backup as a sequence of entries: ['header', array], ['table', name] and
     * ['row', table, array, bytes].
     *
     * @return Generator<int, array>
     */
    private static function entries(string $path): Generator
    {
        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            throw new UnexpectedValueException('The backup file could not be read.');
        }

        try {
            $first = fgets($handle);
            $first = $first === false ? '' : rtrim($first, "\r\n");
            if (str_ends_with($first, '"tables":{')) {
                yield from self::lineEntries($handle, $first);
            } else {
                yield from self::legacyEntries($path);
            }
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param  resource  $handle
     * @return Generator<int, array>
     */
    private static function lineEntries($handle, string $first): Generator
    {
        $header = json_decode($first.'}}', true);
        if (! is_array($header) || ($header['format'] ?? null) !== self::FORMAT) {
            throw new UnexpectedValueException('This file is not a Bulan SeniorCare backup.');
        }
        if (! is_int($header['version'] ?? null) || $header['version'] > self::VERSION) {
            throw new UnexpectedValueException('This backup was made by a newer version of the system.');
        }
        yield ['header', $header];

        $table = null;
        $finished = false;
        while (($line = fgets($handle)) !== false) {
            $line = rtrim($line, "\r\n");
            if ($line === '') {
                continue;
            }
            if ($finished) {
                throw new UnexpectedValueException('The backup file has extra content after its end.');
            }
            if ($line === '}}' && $table === null) {
                $finished = true;

                continue;
            }
            if ($line === ']' && $table !== null) {
                $table = null;

                continue;
            }
            $value = str_starts_with($line, ',') ? substr($line, 1) : $line;
            if ($table === null && str_ends_with($value, ':[')) {
                $table = json_decode(substr($value, 0, -2));
                if (! is_string($table) || $table === '') {
                    throw new UnexpectedValueException('The backup file is damaged.');
                }
                yield ['table', $table];

                continue;
            }
            $row = $table !== null && str_starts_with($value, '{') ? json_decode($value, true) : null;
            if (! is_array($row) || array_is_list($row) && $row !== []) {
                throw new UnexpectedValueException('The backup file is damaged.');
            }
            yield ['row', $table, $row, strlen($value)];
        }

        if (! $finished) {
            throw new UnexpectedValueException('The backup file is incomplete. It may not have finished downloading.');
        }
    }

    /**
     * Backups made before the line-per-row layout.
     *
     * @return Generator<int, array>
     */
    private static function legacyEntries(string $path): Generator
    {
        if (filesize($path) > self::LEGACY_MAX_BYTES) {
            throw new UnexpectedValueException('This backup is too large to restore. Create a new backup and restore that one.');
        }
        $backup = json_decode((string) file_get_contents($path), true);
        if (! is_array($backup) || ! is_array($backup['tables'] ?? null) || array_is_list($backup['tables']) && $backup['tables'] !== []) {
            throw new UnexpectedValueException('This file is not a Bulan SeniorCare backup.');
        }
        yield ['header', $backup];
        foreach ($backup['tables'] as $table => $rows) {
            if (! is_array($rows) || ! array_is_list($rows)) {
                throw new UnexpectedValueException('The backup file is damaged.');
            }
            yield ['table', (string) $table];
            foreach ($rows as $row) {
                if (! is_array($row) || array_is_list($row) && $row !== []) {
                    throw new UnexpectedValueException('The backup file is damaged.');
                }
                yield ['row', (string) $table, $row, strlen((string) json_encode($row))];
            }
        }
    }
}
