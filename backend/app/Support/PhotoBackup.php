<?php

namespace App\Support;

use App\Models\SeniorCitizen;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Railway's disk is reset on every deploy, so uploaded photos and ID documents are also
 * kept in the database and written back to their disk when their file goes missing.
 */
class PhotoBackup
{
    /** Folders on the public disk whose files are backed up and served at /storage. */
    public const DIRECTORIES = ['profile-photos'];

    /**
     * Senior photos and ID documents live on the private disk and are only served through
     * the signed-in senior file route; they are backed up but never served at /storage.
     */
    public const PRIVATE_DIRECTORIES = ['senior-photos', 'senior-documents'];

    public static function store(UploadedFile $photo, string $directory): string
    {
        $path = $photo->store($directory, self::diskFor($directory));
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
        Storage::disk(self::diskFor($path))->delete($path);
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
        Storage::disk(self::diskFor($path))->put($path, $contents);

        return [$contents, $photo->mime_type];
    }

    /** Writes a backed-up file back to its disk if it is missing; true when the file exists after. */
    public static function restoreIfMissing(?string $path): bool
    {
        if (! $path) {
            return false;
        }

        return Storage::disk(self::diskFor($path))->exists($path) || self::restore($path) !== null;
    }

    private static function diskFor(string $path): string
    {
        $directory = explode('/', $path)[0];

        return in_array($directory, self::PRIVATE_DIRECTORIES, true) ? SeniorCitizen::FILE_DISK : 'public';
    }
}
