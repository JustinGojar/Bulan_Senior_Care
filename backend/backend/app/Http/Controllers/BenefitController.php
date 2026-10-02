<?php

namespace App\Http\Controllers;

use App\Models\Benefit;
use Illuminate\Http\JsonResponse;

class BenefitController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Benefit::where('status', 'active')->orderBy('min_age')->get());
    }
}
