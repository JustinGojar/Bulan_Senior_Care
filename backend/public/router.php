<?php

/*
 * Router for PHP's built-in web server (used in production on Railway).
 *
 * The built-in server sends static files uncompressed and without cache
 * headers, so browsers download every script again on each visit. This router
 * serves the built frontend with pre-compressed copies (.br / .gz made at build
 * time) and long-lived cache headers, prevents uploaded-file caching, and
 * hands everything else to Laravel.
 */

require_once __DIR__.'/../app/Support/BrowserSecurity.php';

$publicPath = __DIR__;
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

$types = [
    'js' => 'text/javascript; charset=UTF-8',
    'mjs' => 'text/javascript; charset=UTF-8',
    'css' => 'text/css; charset=UTF-8',
    'html' => 'text/html; charset=UTF-8',
    'json' => 'application/json',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'webp' => 'image/webp',
    'gif' => 'image/gif',
    'ico' => 'image/x-icon',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
    'txt' => 'text/plain; charset=UTF-8',
    'pdf' => 'application/pdf',
    'webmanifest' => 'application/manifest+json',
];

/**
 * Send a file with cache headers, answering conditional requests with 304 and
 * using a pre-compressed sibling when the browser accepts it.
 */
$sendFile = static function (string $file, string $cacheControl) use ($types): bool {
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $etag = '"'.dechex(filemtime($file)).'-'.dechex(filesize($file)).'"';

    header_remove('X-Powered-By');
    header('Cache-Control: '.$cacheControl);
    $buildRoot = realpath(__DIR__.'/spa-assets');
    $html = $extension === 'html' && $buildRoot !== false
        && str_starts_with(realpath($file), $buildRoot.DIRECTORY_SEPARATOR)
        ? file_get_contents($file) : null;
    foreach (\App\Support\BrowserSecurity::headers($html) as $name => $value) {
        header($name.': '.$value);
    }
    header('ETag: '.$etag);
    header('Vary: Accept-Encoding');
    header('Content-Type: '.($types[$extension] ?? (mime_content_type($file) ?: 'application/octet-stream')));

    if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
        http_response_code(304);

        return true;
    }

    $accepts = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
    foreach (['br' => '.br', 'gzip' => '.gz'] as $encoding => $suffix) {
        if (str_contains($accepts, $encoding) && is_file($file.$suffix)) {
            header('Content-Encoding: '.$encoding);
            $file .= $suffix;
            break;
        }
    }

    header('Content-Length: '.filesize($file));
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
        readfile($file);
    }

    return true;
};

// The installable-app files are built into spa-assets but answered at the site root:
// a service worker only controls pages under its own path, and the manifest names /icons/.
if (preg_match('#^/(sw\.js|manifest\.webmanifest|icons/[A-Za-z0-9_-]+\.png|fonts/[A-Za-z0-9_.-]+)$#', $uri, $match)) {
    $pwaFile = $publicPath.'/spa-assets/'.$match[1];
    if (is_file($pwaFile)) {
        return $sendFile($pwaFile, (str_starts_with($match[1], 'icons/') || str_starts_with($match[1], 'fonts/')) ? 'public, max-age=86400' : 'no-cache');
    }
}

$path = realpath($publicPath.$uri);
$isFile = $path !== false && is_file($path);
// Checks the resolved location, so "/spa-assets/../index.php" cannot match.
$isUnder = static fn (string $directory): bool => $isFile
    && ($root = realpath($publicPath.'/'.$directory)) !== false
    && str_starts_with($path, $root.DIRECTORY_SEPARATOR);

if ($isUnder('spa-assets') && ! str_ends_with($path, '.php')) {
    // Hashed build output never changes for a given name.
    $cache = $isUnder('spa-assets/assets')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache';

    return $sendFile($path, $cache);
}

if ($isUnder('storage') && ! str_ends_with($path, '.php')) {
    // Uploaded files must not remain in browser or shared caches.
    return $sendFile($path, 'no-store, private');
}

if ($uri !== '/' && $isFile && str_starts_with($path, $publicPath.DIRECTORY_SEPARATOR) && ! str_ends_with($path, '.php')) {
    return $sendFile($path, 'no-cache');
}

require $publicPath.'/index.php';
