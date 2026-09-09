<?php

namespace App\Http\Controllers;

use App\Models\BenefitRelease;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BenefitReleaseController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(BenefitRelease::with([
            'benefit:id,benefit_name',
            'creator:id,name,role',
            'updater:id,name,role',
        ])->latest('release_date')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeStaff($request);
        $data = $request->validate([
            'benefit_id' => ['required', 'integer', 'exists:benefits,id'],
            'period_label' => [
                'required', 'string', 'max:100',
                Rule::unique('benefit_releases')->where(fn ($query) => $query->where('benefit_id', $request->integer('benefit_id'))),
            ],
            'amount' => ['required', 'numeric', 'min:0'],
            'release_date' => ['required', 'date'],
            'status' => ['required', 'in:scheduled,released,cancelled'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;
        $release = BenefitRelease::create($data);

        $benefitName = $release->load('benefit:id,benefit_name')->benefit->benefit_name;
        User::query()->where('role', 'leader')->where('status', 'active')->each(function (User $leader) use ($release, $benefitName, $request) {
            Notification::create([
                'sender_account_id' => $request->user()->id,
                'recipient_account_id' => $leader->id,
                'message' => "{$benefitName} release is scheduled for {$release->release_date->format('F j, Y')} ({$release->period_label}).",
                'source_type' => 'benefit_release',
                'source_id' => $release->id,
                'channel' => 'in_app',
                'date_sent' => now(),
                'status' => 'unread',
            ]);
        });

        return response()->json($release->load(['benefit:id,benefit_name', 'creator:id,name,role', 'updater:id,name,role']), 201);
    }

    private function authorizeStaff(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'head'], true), 403, 'Only Admin and Head accounts can manage benefit release schedules.');
    }
}