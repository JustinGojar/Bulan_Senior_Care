<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiAuthenticationTest extends TestCase
{
    public function test_unauthenticated_api_requests_receive_a_json_401(): void
    {
        $this->withHeader('Origin', 'https://bulan-senior-care.vercel.app')
            ->get('/api/seniors')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.'])
            ->assertHeader('Access-Control-Allow-Origin', 'https://bulan-senior-care.vercel.app');
    }

    public function test_cors_preflight_allows_the_production_frontend_origin(): void
    {
        $this->withHeaders([
            'Origin' => 'https://bulan-senior-care.vercel.app',
            'Access-Control-Request-Method' => 'GET',
            'Access-Control-Request-Headers' => 'authorization,content-type,accept,x-requested-with',
        ])->options('/api/seniors')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://bulan-senior-care.vercel.app')
            ->assertHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->assertHeader('Access-Control-Allow-Headers', 'authorization, content-type, accept, x-requested-with');
    }
}
