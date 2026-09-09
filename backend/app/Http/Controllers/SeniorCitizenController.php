<?php

namespace App\Http\Controllers;

use App\Models\SeniorCitizen;
use App\Models\Barangay;
use App\Models\Benefit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Validation\Rule;

class SeniorCitizenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SeniorCitizen::with([
            'barangay:id,barangay_name',
            'benefits:id,benefit_name',
            'encoder:id,name,role',
        ]);
        if ($request->user()->role === 'leader') {
            $query->where('barangay_id', $request->user()->barangay_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->boolean('pending_only')) {
            $query->where('status', 'pending');
        } elseif ($request->boolean('exclude_pending')) {
            $query->where('status', '!=', 'pending');
        }
        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(fn ($q) => $q->where('osca_id_number', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")->orWhere('first_name', 'like', "%{$search}%"));
        }

        if ($request->boolean('count_only')) {
            return response()->json(['data' => [], 'meta' => ['total' => $query->count()]]);
        }

        return response()->json($query->latest()->paginate(25));
    }

    public function archive(Request $request): JsonResponse
    {
        abort_if($request->user()->role !== 'admin', 403, 'Only Admin can view the archive.');

        return response()->json(SeniorCitizen::onlyTrashed()->latest('deleted_at')->paginate(25));
    }

    public function restore(Request $request, string $oscaId): JsonResponse
    {
        abort_if($request->user()->role !== 'admin', 403, 'Only Admin can restore records.');
        $senior = SeniorCitizen::onlyTrashed()->where('osca_id_number', $oscaId)->firstOrFail();
        $senior->restore();

        return response()->json($senior->fresh()->load(['barangay', 'benefits']));
    }

    public function archiveRecord(Request $request, SeniorCitizen $senior): JsonResponse
    {
        abort_if($request->user()->role === 'admin', 403, 'Admin accounts should use permanent delete.');
        $this->authorizeScope($request, $senior);
        $senior->delete();

        return response()->json(status: 204);
    }

    public function store(Request $request): JsonResponse
    {
        abort_if($request->user()->role === 'head', 403, 'The Head role is read-only for senior registration.');
        $data = $request->validate($this->rules());
        foreach (['valid_id', 'birth_certificate'] as $documentField) {
            if ($request->hasFile($documentField)) {
                $documentPath = $request->file($documentField)->store('senior-documents', 'public');
                $data["{$documentField}_path"] = $documentPath;
            }
        }
        if ($request->hasFile('profile_photo')) {
            $data['photo_path'] = $request->file('profile_photo')->store('senior-photos', 'public');
        }
        if ($request->filled('barangay')) {
            $barangay = Barangay::firstOrCreate([
                'barangay_name' => $request->string('barangay'),
            ]);
            $data['barangay_id'] = $barangay->id;
        }
        if ($request->user()->role === 'leader') {
            abort_if(! $request->user()->barangay_id, 422, 'Your account has no barangay assignment.');
            $data['barangay_id'] = $request->user()->barangay_id;
        }
        abort_if(! $data['barangay_id'], 422, 'A barangay is required.');
        $duplicate = SeniorCitizen::whereDate('birthdate', $data['birthdate'])->where('last_name', $data['last_name'])->where('first_name', $data['first_name'])->exists();
        abort_if($duplicate, 422, 'A senior with the same name and birthdate already exists.');
        $benefitName = [
            'Octogenarian' => 'Octogenarian Grant',
            'Nonagenarian' => 'Nonagenarian Grant',
            'Centenarian' => 'Centenarian Award',
        ][$request->string('benefit')->toString()] ?? $request->string('benefit')->toString();
        $benefit = Benefit::where('benefit_name', $benefitName)
            ->where('status', 'active')
            ->first();
        abort_if(! $benefit, 422, 'A valid benefit is required.');
        $data['encoded_by'] = $request->user()->id;
        $data['registration_date'] ??= today();
        $data['status'] = 'pending';
        $senior = null;
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $data['osca_id_number'] = $this->nextOscaId();
            try {
                $senior = SeniorCitizen::create($data);
                break;
            } catch (QueryException $exception) {
                if (($exception->errorInfo[1] ?? null) !== 1062 || $attempt === 2) {
                    throw $exception;
                }
            }
        }
        $senior->benefits()->attach($benefit->id, [
            'distributed_by' => $request->user()->id,
            'amount' => $benefit->amount ?? 0,
            'status' => 'pending',
            'period_label' => 'Registration '.today()->toDateString(),
        ]);

        return response()->json($senior->load(['barangay', 'benefits']), 201);
    }

    public function show(SeniorCitizen $senior): JsonResponse
    {
        $this->authorizeScope(request(), $senior);

        return response()->json($senior->load(['barangay', 'benefits']));
    }

    public function update(Request $request, SeniorCitizen $senior): JsonResponse
    {
        abort_if($request->user()->role === 'leader', 403, 'Leader edits require Head approval.');
        $this->authorizeScope($request, $senior);
        $data = $request->validate($this->rules(true));
        if (array_key_exists('barangay', $data)) {
            $data['barangay_id'] = Barangay::where('barangay_name', $data['barangay'])->value('id');
            unset($data['barangay']);
        }
        foreach (['valid_id', 'birth_certificate'] as $documentField) {
            if ($request->hasFile($documentField)) {
                $data["{$documentField}_path"] = $request->file($documentField)->store('senior-documents', 'public');
            }
        }
        if ($request->hasFile('profile_photo')) {
            $data['photo_path'] = $request->file('profile_photo')->store('senior-photos', 'public');
        }
        $senior->update($data);

        return response()->json($senior->fresh()->load('barangay'));
    }

    public function destroy(Request $request, SeniorCitizen $senior): JsonResponse
    {
        abort_if($request->user()->role !== 'admin', 403, 'Only Admin can delete records.');
        $senior->delete();

        return response()->json(status: 204);
    }

    private function rules(bool $sometimes = false): array
    {
        $optional = static fn (string $rule): array => $sometimes ? ['sometimes', $rule] : [$rule];

        return [
            'barangay_id' => [...$optional('integer'), 'exists:barangays,id'],
            'barangay' => [...$optional('nullable'), 'string', 'max:100'],
            'benefit' => [...$optional('required'), 'string', 'max:100'],
            'valid_id' => [...($sometimes ? ['sometimes', 'nullable'] : ['required']), 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'birth_certificate' => [...($sometimes ? ['sometimes', 'nullable'] : ['required']), 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'profile_photo' => [...($sometimes ? ['sometimes', 'nullable'] : ['nullable']), 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'last_name' => [...$optional('string'), 'max:100'],
            'first_name' => [...$optional('string'), 'max:100'],
            'middle_name' => [...$optional('nullable'), 'string', 'max:100'],
            'suffix' => [...$optional('nullable'), 'string', 'max:20'],
            'birthdate' => [...$optional('date'), 'before_or_equal:'.now()->subYears(60)->toDateString()],
            'sex' => [...$optional('required'), Rule::in(['male', 'female'])],
            'contact_number' => [...$optional('nullable'), 'string', 'max:30'],
            'address' => [...$optional('nullable'), 'string'],
            'civil_status' => [...$optional('nullable'), 'string', 'max:50'],
            'living_arrangement' => [...$optional('nullable'), 'string', 'max:100'],
            'registration_date' => [...$optional('nullable'), 'date'],
            'status' => [...$optional('nullable'), Rule::in(['active', 'pending', 'inactive'])],
        ];
    }

    private function authorizeScope(Request $request, SeniorCitizen $senior): void
    {
        abort_if($request->user()->role === 'leader' && $request->user()->barangay_id !== $senior->barangay_id, 403, 'This record is outside your barangay.');
    }

    private function nextOscaId(): string
    {
        $year = now()->year;
        $last = SeniorCitizen::withTrashed()
            ->where('osca_id_number', 'like', "BSC-{$year}-%")
            ->orderByDesc('id')
            ->value('osca_id_number');

        return sprintf('BSC-%d-%04d', $year, $last ? ((int) substr($last, -4)) + 1 : 1);
    }
}
