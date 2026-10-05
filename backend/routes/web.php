<?php

use Illuminate\Support\Facades\Route;

$spaShell = static function () {
    $shellPath = public_path('spa-assets/_shell.html');
    abort_unless(is_file($shellPath), 503, 'The frontend SPA shell has not been built.');

    return response()->file($shellPath, [
        'Content-Type' => 'text/html; charset=UTF-8',
    ]);
};

Route::get('/', $spaShell)->name('spa.home');
Route::get('/{path}', $spaShell)
    ->where('path', '^(?!api(?:/|$)|up$|spa-assets(?:/|$)).*$');
