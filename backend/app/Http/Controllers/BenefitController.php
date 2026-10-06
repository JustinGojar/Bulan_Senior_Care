<?php

namespace App\Http\Controllers;

use App\Models\Benefit;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class BenefitController extends Controller
{
    public function index(): JsonResponse
    {
        // Benefit programs rarely change; saving one clears this entry.
        return response()->json(Cache::remember(Benefit::ACTIVE_LIST_CACHE_KEY, now()->addHour(), fn () => Benefit::where('status', 'active')->orderBy('min_age')->get()->toArray()));
    }
}
