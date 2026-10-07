<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class ProfilePhotoController extends Controller
{
    /**
     * Serve a profile photo whose file is gone from storage (Railway's disk is reset on
     * every deploy) from the copy kept in the database, and put the file back.
     */
    public function show(string $file): Response
    {
        $path = 'profile-photos/'.$file;
        $photo = DB::table('profile_photos')->where('path', $path)->first();
        abort_unless($photo, 404);

        $contents = base64_decode($photo->contents);
        Storage::disk('public')->put($path, $contents);

        return response($contents, 200, [
            'Content-Type' => $photo->mime_type,
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
