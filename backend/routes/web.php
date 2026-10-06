<?php

use Illuminate\Support\Facades\Route;

$spaShell = static function () {
    $shellPath = public_path('spa-assets/_shell.html');
    abort_unless(is_file($shellPath), 503, 'The frontend SPA shell has not been built.');

    return response()->file($shellPath, [
        'Content-Type' => 'text/html; charset=UTF-8',
        // Always check for a new deploy; the hashed assets it points to are cached for a year.
        'Cache-Control' => 'no-cache',
    ]);
};

Route::get('/', $spaShell)->name('spa.home');
Route::get('/{path}', $spaShell)
    ->where('path', '^(?!api(?:/|$)|up$|spa-assets(?:/|$)).*$');
