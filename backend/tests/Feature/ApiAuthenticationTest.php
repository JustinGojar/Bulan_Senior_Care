<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiAuthenticationTest extends TestCase
{
    public function test_unauthenticated_api_requests_receive_a_json_401(): void
    {
        $this->withHeader('Origin', 'http://localhost:5173')
            ->get('/api/seniors')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.'])
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    public function test_cors_preflight_allows_the_local_frontend_origin(): void
    {
        $this->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Access-Control-Request-Method' => 'GET',
            'Access-Control-Request-Headers' => 'authorization,content-type,accept,x-requested-with',
        ])->options('/api/seniors')
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->assertHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->assertHeader('Access-Control-Allow-Headers', 'authorization, content-type, accept, x-requested-with');
    }
}
