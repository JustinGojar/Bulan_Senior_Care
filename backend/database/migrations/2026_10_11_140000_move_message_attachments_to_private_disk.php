<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Moves message attachments off the public disk, where anyone holding a link could open
 * them, onto the private disk the API serves them from to the sender and recipient only.
 * Stored paths are unchanged; only the disk differs.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->moveFiles('public', 'local');
    }

    public function down(): void
    {
        $this->moveFiles('local', 'public');
    }

    private function moveFiles(string $from, string $to): void
    {
        $source = Storage::disk($from);
        $target = Storage::disk($to);

        DB::table('messages')->whereNotNull('attachment_path')->orderBy('id')->pluck('attachment_path')
            ->unique()
            ->each(function (string $path) use ($source, $target): void {
                if (! $source->exists($path)) {
                    return;
                }
                if (! $target->exists($path)) {
                    $stream = $source->readStream($path);
                    $target->writeStream($path, $stream);
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }
                $source->delete($path);
            });
    }
};
