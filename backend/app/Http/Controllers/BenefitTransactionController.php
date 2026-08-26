<?php

namespace App\Http\Controllers;

use App\Models\BenefitTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BenefitTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = BenefitTransaction::with([
            'senior.barangay',
            'senior.encoder:id,name,role',
            'benefit:id,benefit_name,amount',
            'distributor:id,name,role',
        ])->latest();

        if ($request->user()->role === 'leader') {
            $query->whereHas('senior', fn ($senior) => $senior->where('barangay_id', $request->user()->barangay_id));
        }

        return response()->json($query->get());
    }

    public function update(Request $request, BenefitTransaction $benefitTransaction): JsonResponse
    {
        $senior = $benefitTransaction->senior;
        abort_if($request->user()->role === 'head', 403, 'The Head role is read-only for benefit releases.');
        abort_if($request->user()->role === 'leader' && $request->user()->barangay_id !== $senior->barangay_id, 403, 'This record is outside your barangay.');

        $data = $request->validate([
            'status' => ['required', 'in:released,failed,pending'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);
        $benefitTransaction->update([
            ...$data,
            'date_distributed' => $data['status'] === 'released' ? today() : null,
            'distributed_by' => $request->user()->id,
        ]);

        return response()->json($benefitTransaction->fresh()->load([
            'senior.barangay',
            'senior.encoder:id,name,role',
            'benefit:id,benefit_name,amount',
            'distributor:id,name,role',
        ]));
    }
}