<?php

namespace Tests\Feature;

use Tests\TestCase;

class SpaFallbackTest extends TestCase
{
    private string $spaPublicPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->spaPublicPath = sys_get_temp_dir().DIRECTORY_SEPARATOR.'bulan-spa-fallback-'.bin2hex(random_bytes(8));
        $assetsPath = $this->spaPublicPath.DIRECTORY_SEPARATOR.'spa-assets';

        if (! mkdir($assetsPath, 0777, true) && ! is_dir($assetsPath)) {
            throw new \RuntimeException('Unable to create the temporary SPA assets directory.');
        }

        if (file_put_contents($assetsPath.DIRECTORY_SEPARATOR.'_shell.html', '<html>SPA test shell</html>') === false) {
            throw new \RuntimeException('Unable to create the temporary SPA shell fixture.');
        }

        $this->app->usePublicPath($this->spaPublicPath);
    }

    protected function tearDown(): void
    {
        $assetsPath = $this->spaPublicPath.DIRECTORY_SEPARATOR.'spa-assets';
        $shellPath = $assetsPath.DIRECTORY_SEPARATOR.'_shell.html';

        if (is_file($shellPath) && ! unlink($shellPath)) {
            throw new \RuntimeException('Unable to remove the temporary SPA shell fixture.');
        }

        if (is_dir($assetsPath) && ! rmdir($assetsPath)) {
            throw new \RuntimeException('Unable to remove the temporary SPA assets directory.');
        }

        if (is_dir($this->spaPublicPath) && ! rmdir($this->spaPublicPath)) {
            throw new \RuntimeException('Unable to remove the temporary SPA public directory.');
        }

        parent::tearDown();
    }

    public function test_frontend_routes_are_served_by_the_spa_shell(): void
    {
        foreach (['/', '/login', '/dashboard', '/seniors', '/benefits', '/analytics', '/reports', '/settings'] as $path) {
            $this->get($path)
                ->assertOk()
                ->assertHeader('content-type', 'text/html; charset=UTF-8');
        }
    }

    public function test_unknown_api_routes_are_not_served_by_the_spa_shell(): void
    {
        $this->getJson('/api/not-a-route')->assertNotFound();
    }
}
