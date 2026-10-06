<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_application_returns_a_successful_response(): void
    {
        $publicPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'bulan-example-shell-'.bin2hex(random_bytes(8));
        $assetsPath = $publicPath.DIRECTORY_SEPARATOR.'spa-assets';

        if (! mkdir($assetsPath, 0777, true) && ! is_dir($assetsPath)) {
            throw new \RuntimeException('Unable to create the temporary SPA assets directory.');
        }

        $shellPath = $assetsPath.DIRECTORY_SEPARATOR.'_shell.html';
        if (file_put_contents($shellPath, '<html>SPA test shell</html>') === false) {
            throw new \RuntimeException('Unable to create the temporary SPA shell fixture.');
        }

        $this->app->usePublicPath($publicPath);

        $this->get('/')
            ->assertOk()
            ->assertHeader('content-type', 'text/html; charset=UTF-8');

        if (is_file($shellPath) && ! unlink($shellPath)) {
            throw new \RuntimeException('Unable to remove the temporary SPA shell fixture.');
        }

        if (is_dir($assetsPath) && ! rmdir($assetsPath)) {
            throw new \RuntimeException('Unable to remove the temporary SPA assets directory.');
        }

        if (is_dir($publicPath) && ! rmdir($publicPath)) {
            throw new \RuntimeException('Unable to remove the temporary SPA public directory.');
        }
    }
}
