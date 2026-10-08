<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Moves senior photos, ID documents, birth certificates and benefit proofs off the public
 * disk, where anyone holding a link could open them, onto the private disk the API serves
 * them from. Stored paths are unchanged; only the disk differs.
 */
return new class extends Migration
{
    private const COLUMNS = [
        'senior_citizens' => ['photo_path', 'id_document_path', 'valid_id_path', 'birth_certificate_path'],
        'benefit_transactions' => ['attachment_path'],
    ];

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

        foreach (self::COLUMNS as $table => $columns) {
            foreach ($columns as $column) {
                DB::table($table)->whereNotNull($column)->orderBy('id')->pluck($column)
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
        }
    }
};
