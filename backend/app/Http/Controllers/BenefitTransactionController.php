<?php

namespace App\Http\Controllers;

use App\Models\BenefitTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BenefitTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = BenefitTransaction::with([
            'senior.barangay',
            'senior.encoder:id,name,role',
            'benefit:id,benefit_name,amount',
                        'distributor:id,name,role',
                        'creator:id,name,role',
                        'updater:id,name,role',
        ])->latest();
        $query->whereHas('senior')->whereHas('benefit');

        if ($request->user()->role === 'leader') {
            $query->whereHas('senior', fn ($senior) => $senior->where('barangay_id', $request->user()->barangay_id));
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeTransactionEditor($request);
        $data = $request->validate([
            'senior_citizen_id' => ['required', 'integer', 'exists:senior_citizens,id'],
            'benefit_id' => ['required', 'integer', 'exists:benefits,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'period_label' => [
                'required', 'string', 'max:100',
                Rule::unique('benefit_transactions')->where(fn ($query) => $query
                    ->where('senior_citizen_id', $request->integer('senior_citizen_id'))
                    ->where('benefit_id', $request->integer('benefit_id'))),
            ],
            'date_distributed' => ['nullable', 'date', 'required_if:status,released'],
            'status' => ['required', 'in:released,failed,pending'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string', 'max:500'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);
        $senior = \App\Models\SeniorCitizen::findOrFail($data['senior_citizen_id']);
        $this->authorizeScope($request, $senior);
        $data['distributed_by'] = $request->user()->id;
        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;
        if ($request->hasFile('attachment')) {
            $data['attachment_path'] = $request->file('attachment')->store('benefit-proofs', 'public');
        }
        unset($data['attachment']);

        $transaction = BenefitTransaction::create($data);

        return response()->json($transaction->load($this->relations()), 201);
    }

    public function update(Request $request, BenefitTransaction $benefitTransaction): JsonResponse
    {
        $senior = $benefitTransaction->senior;
        $this->authorizeTransactionEditor($request);
        $this->authorizeScope($request, $senior);

        $data = $request->validate([
            'status' => ['required', 'in:released,failed,pending'],
            'amount' => ['required', 'numeric', 'min:0'],
            'period_label' => [
                'required', 'string', 'max:100',
                Rule::unique('benefit_transactions')->ignore($benefitTransaction->id)->where(fn ($query) => $query
                    ->where('senior_citizen_id', $benefitTransaction->senior_citizen_id)
                    ->where('benefit_id', $benefitTransaction->benefit_id)),
            ],
            'date_distributed' => ['nullable', 'date', 'required_if:status,released'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'remarks' => ['nullable', 'string', 'max:500'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);
        if ($request->hasFile('attachment')) {
            $data['attachment_path'] = $request->file('attachment')->store('benefit-proofs', 'public');
        }
        unset($data['attachment']);
        $benefitTransaction->update([
            ...$data,
            'distributed_by' => $data['status'] === 'released' ? $request->user()->id : $benefitTransaction->distributed_by,
            'updated_by' => $request->user()->id,
        ]);

        return response()->json($benefitTransaction->fresh()->load($this->relations()));
    }

    private function relations(): array
    {
        return [
            'senior.barangay',
            'senior.encoder:id,name,role',
            'benefit:id,benefit_name,amount',
            'distributor:id,name,role',
            'creator:id,name,role',
            'updater:id,name,role',
        ];
    }

    private function authorizeStaff(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'head'], true), 403, 'Only Admin and Head accounts can manage benefit releases.');
    }

    private function authorizeTransactionEditor(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'leader'], true), 403, 'Only Admin and Leader accounts can update benefit statuses.');
    }

    private function authorizeScope(Request $request, \App\Models\SeniorCitizen $senior): void
    {
        abort_if($request->user()->role === 'leader' && $request->user()->barangay_id !== $senior->barangay_id, 403, 'This record is outside your barangay.');
    }
}