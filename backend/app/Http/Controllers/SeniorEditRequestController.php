<?php

namespace App\Http\Controllers;

use App\Models\Barangay;
use App\Models\SeniorEditRequest;
use App\Models\Benefit;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SeniorEditRequestController extends Controller
{
    /** Senior record columns a president's edit request can change once Head approves it. */
    private const EDITABLE_FIELDS = [
        'first_name', 'middle_name', 'last_name', 'birthdate', 'place_of_birth', 'sex', 'civil_status',
        'educational_attainment', 'other_skills', 'family_composition', 'association_name',
        'association_address', 'association_membership_date', 'association_position', 'address',
        'contact_number',
    ];

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'head', 403, 'Only Head can review senior edit requests.');

        return response()->json(SeniorEditRequest::with([
            'senior.barangay',
            'senior.benefit:id,benefit_name',
            'requester:id,name,role',
        ])->where('status', 'pending')->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'president', 403, 'Only Barangay Presidents can submit edit requests.');
        $data = $request->validate([
            'senior_id' => ['required', 'exists:senior_citizens,osca_id_number'],
            'changes' => ['required', 'array'],
            'changes.first_name' => ['required', 'string', 'max:100'],
            'changes.middle_name' => ['nullable', 'string', 'max:100'],
            'changes.last_name' => ['required', 'string', 'max:100'],
            'changes.birthdate' => ['required', 'date', 'before_or_equal:'.now()->subYears(60)->toDateString()],
            'changes.place_of_birth' => ['nullable', 'string', 'max:150'],
            'changes.sex' => ['sometimes', Rule::in(['male', 'female'])],
            'changes.civil_status' => ['nullable', 'string', 'max:50'],
            'changes.educational_attainment' => ['nullable', 'string', 'max:255'],
            'changes.other_skills' => ['nullable', 'string', 'max:255'],
            'changes.family_composition' => ['nullable', 'string'],
            'changes.association_name' => ['nullable', 'string', 'max:150'],
            'changes.association_address' => ['nullable', 'string', 'max:255'],
            'changes.association_membership_date' => ['nullable', 'date'],
            'changes.association_position' => ['nullable', 'string', 'max:100'],
            'changes.address' => ['nullable', 'string'],
            'changes.contact_number' => ['nullable', 'string', 'max:30'],
            'changes.barangay' => ['required', 'string', 'exists:barangays,barangay_name'],
            'changes.benefit' => ['required', 'string', Rule::exists('benefits', 'benefit_name')->where('status', 'active')],
        ], [
            'changes.benefit.exists' => 'A valid benefit is required.',
        ]);
        // Keep only the fields a president may change, so nothing else can ride along to approval.
        $data['changes'] = array_intersect_key($data['changes'], array_flip([...self::EDITABLE_FIELDS, 'barangay', 'benefit']));
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
                $barangayId = Barangay::where('barangay_name', $changes['barangay'])->value('id');
                abort_if(! $barangayId, 422, 'The requested barangay no longer exists.');
                $benefitId = Benefit::where('benefit_name', $changes['benefit'])->where('status', 'active')->value('id');
                abort_if(! $benefitId, 422, 'The requested benefit is no longer available.');
                // Only the fields in the request change; anything it leaves out keeps its value.
                $senior->update([
                    ...array_intersect_key($changes, array_flip(self::EDITABLE_FIELDS)),
                    'barangay_id' => $barangayId,
                    'benefit_id' => $benefitId,
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