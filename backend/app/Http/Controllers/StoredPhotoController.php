<?php

namespace App\Http\Controllers;

use App\Support\PhotoBackup;
use Symfony\Component\HttpFoundation\Response;

class StoredPhotoController extends Controller
{
    /**
     * Serve a photo whose file is gone from storage (Railway's disk is reset on every
     * deploy) from the copy kept in the database, and put the file back.
     */
    public function show(string $directory, string $file): Response
    {
        $restored = PhotoBackup::restore($directory.'/'.$file);
        abort_unless($restored, 404);
        [$contents, $mimeType] = $restored;

        return response($contents, 200, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
