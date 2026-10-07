<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Railway's disk is reset on every deploy, so uploaded photos are also kept in the
 * database and written back to the public disk when their file goes missing.
 */
class PhotoBackup
{
    /** Folders on the public disk whose photos are backed up. */
    public const DIRECTORIES = ['profile-photos', 'senior-photos'];

    public static function store(UploadedFile $photo, string $directory): string
    {
        $path = $photo->store($directory, 'public');
        DB::table('stored_photos')->insert([
            'path' => $path,
            'mime_type' => $photo->getMimeType(),
            'contents' => base64_encode($photo->get()),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $path;
    }

    public static function delete(?string $path): void
    {
        if (! $path) {
            return;
        }
        Storage::disk('public')->delete($path);
        DB::table('stored_photos')->where('path', $path)->delete();
    }

    /** @return array{0: string, 1: string}|null the contents and MIME type */
    public static function restore(string $path): ?array
    {
        $photo = DB::table('stored_photos')->where('path', $path)->first();
        if (! $photo) {
            return null;
        }
        $contents = base64_decode($photo->contents);
        Storage::disk('public')->put($path, $contents);

        return [$contents, $photo->mime_type];
    }
}
