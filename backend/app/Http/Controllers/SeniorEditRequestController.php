<?php

namespace App\Http\Controllers;

use App\Models\SeniorEditRequest;
use App\Models\Benefit;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SeniorEditRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'head', 403, 'Only Head can review senior edit requests.');

        return response()->json(SeniorEditRequest::with([
            'senior.barangay',
            'senior.benefits',
            'requester:id,name,role',
        ])->where('status', 'pending')->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'leader', 403, 'Only Barangay Leaders can submit edit requests.');
        $data = $request->validate([
            'senior_id' => ['required', 'exists:senior_citizens,osca_id_number'],
            'changes' => ['required', 'array'],
            'changes.first_name' => ['required', 'string', 'max:100'],
            'changes.middle_name' => ['nullable', 'string', 'max:100'],
            'changes.last_name' => ['required', 'string', 'max:100'],
            'changes.birthdate' => ['required', 'date', 'before_or_equal:'.now()->subYears(60)->toDateString()],
            'changes.address' => ['nullable', 'string'],
            'changes.contact_number' => ['nullable', 'string', 'max:30'],
            'changes.barangay' => ['required', 'string', 'exists:barangays,barangay_name'],
            'changes.benefit' => ['required', 'string', 'max:100'],
        ]);
        $senior = \App\Models\SeniorCitizen::where('osca_id_number', $data['senior_id'])->firstOrFail();
        abort_if($senior->barangay_id !== $request->user()->barangay_id, 403, 'This record is outside your barangay.');
        abort_if(SeniorEditRequest::where('senior_citizen_id', $senior->id)->where('status', 'pending')->exists(), 422, 'This senior already has a pending edit request.');

        $editRequest = SeniorEditRequest::create([
            'senior_citizen_id' => $senior->id,
            'requested_by' => $request->user()->id,
            'changes' => $data['changes'],
        ]);
        User::where('role', 'head')->where('status', 'active')->each(fn (User $head) => DB::table('notifications')->insert([
            'recipient_account_id' => $head->id,
            'message' => "{$request->user()->name} requested an update to senior {$senior->osca_id_number}.",
            'channel' => 'in_app',
            'status' => 'unread',
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json($editRequest->load(['senior', 'requester:id,name,role']), 201);
    }

    public function update(Request $request, SeniorEditRequest $seniorEditRequest): JsonResponse
    {
        abort_unless($request->user()->role === 'head', 403, 'Only Head can review senior edit requests.');
        abort_if($seniorEditRequest->status !== 'pending', 422, 'This request has already been reviewed.');
        $data = $request->validate([
            'status' => ['required', 'in:approved,declined'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);
        $senior = $seniorEditRequest->senior;

        DB::transaction(function () use ($seniorEditRequest, $senior, $request, $data): void {
            if ($data['status'] === 'approved') {
                abort_if(! $senior, 422, 'This senior record no longer exists and cannot be approved.');
                $changes = $seniorEditRequest->changes;
                $senior->update([
                    'first_name' => $changes['first_name'],
                    'middle_name' => $changes['middle_name'] ?? null,
                    'last_name' => $changes['last_name'],
                    'birthdate' => $changes['birthdate'],
                    'address' => $changes['address'] ?? null,
                    'contact_number' => $changes['contact_number'] ?? null,
                ]);
                $senior->update([
                    'barangay_id' => \App\Models\Barangay::where('barangay_name', $changes['barangay'])->value('id'),
                ]);
                $benefit = Benefit::where('benefit_name', $changes['benefit'])->where('status', 'active')->firstOrFail();
                $senior->benefits()->wherePivot('status', 'pending')->syncWithoutDetaching([
                    $benefit->id => [
                        'distributed_by' => $request->user()->id,
                        'amount' => $benefit->amount ?? 0,
                        'period_label' => 'Registration '.today()->toDateString(),
                        'status' => 'pending',
                    ],
                ]);
            }
            $seniorEditRequest->update([
                ...$data,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
        });

        return response()->json($seniorEditRequest->fresh()->load(['senior', 'requester:id,name,role']));
    }
}