<?php

namespace App\Console\Commands;

use App\Support\DatabaseBackup;
use Illuminate\Console\Command;
use UnexpectedValueException;

/**
 * Restores a backup from the server, for when nobody can sign in to the portal or the file
 * is too large to upload.
 */
class RestoreBackup extends Command
{
    protected $signature = 'backup:restore {file : Path to the backup JSON file} {--force : Restore without asking for confirmation}';

    protected $description = 'Replace the system data with a Bulan SeniorCare backup file';

    public function handle(): int
    {
        $path = (string) $this->argument('file');
        if (! is_file($path)) {
            $this->error("No file at {$path}.");

            return self::FAILURE;
        }

        try {
            $summary = DatabaseBackup::inspect($path);
            $this->info('Backup created at '.($summary['created_at'] ?? 'an unknown time').', '.array_sum($summary['tables']).' rows in '.count($summary['tables']).' tables.');
            if (! $this->option('force') && ! $this->confirm('This replaces the current data and signs every account out. Continue?')) {
                $this->line('Nothing was changed.');

                return self::FAILURE;
            }
            DatabaseBackup::restore($path);
        } catch (UnexpectedValueException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info('The backup was restored.');
        if ($summary['skipped_tables'] !== []) {
            $this->warn('Skipped tables this system does not restore: '.implode(', ', $summary['skipped_tables']).'.');
        }

        return self::SUCCESS;
    }
}
