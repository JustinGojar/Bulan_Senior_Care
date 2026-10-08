<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Benefit;
use App\Models\BenefitTransaction;
use App\Models\PayrollBatch;
use App\Models\SeniorCitizen;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AtmPayrollTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $leader;

    private Benefit $pension;

    private Barangay $barangay;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->barangay = Barangay::create(['barangay_name' => 'Calpi']);
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->leader = User::factory()->create(['role' => 'leader', 'status' => 'active', 'barangay_id' => $this->barangay->id]);
        $this->pension = Benefit::create([
            'benefit_name' => 'Social Pension',
            'benefit_type' => 'social_pension',
            'min_age' => 60,
            'amount' => 3000,
            'funding_source' => 'national',
            'schedule' => 'quarterly',
            'status' => 'active',
        ]);
    }

    private function senior(string $oscaId, array $attributes = []): SeniorCitizen
    {
        $senior = SeniorCitizen::create([
            'osca_id_number' => $oscaId,
            'barangay_id' => $this->barangay->id,
            'encoded_by' => $this->leader->id,
            'first_name' => 'Senior',
            'last_name' => $oscaId,
            'birthdate' => '1950-01-01',
            'sex' => 'female',
            'registration_date' => '2026-01-01',
            'status' => 'active',
            ...$attributes,
        ]);
        $senior->benefits()->attach($this->pension->id, [
            'distributed_by' => $this->leader->id,
            'amount' => 3000,
            'status' => 'pending',
            'period_label' => 'Registration 2026-01-01',
        ]);

        return $senior;
    }

    public function test_atm_accounts_are_imported_by_osca_id(): void
    {
        $senior = $this->senior('OSCA-1');

        $this->actingAs($this->admin, 'sanctum')->postJson('/api/atm-accounts', ['accounts' => [
            ['osca_id_number' => 'OSCA-1', 'account_last4' => '1234'],
            ['osca_id_number' => 'MISSING', 'account_last4' => '9999'],
        ]])
            ->assertOk()
            ->assertJsonPath('updated', 1)
            ->assertJsonPath('unmatched.0.osca_id_number', 'MISSING');

        $this->assertSame('1234', $senior->fresh()->atm_account_last4);
    }

    public function test_payroll_includes_only_active_seniors_with_an_atm_account(): void
    {
        $this->senior('OSCA-1', ['atm_account_last4' => '1111']);
        $this->senior('OSCA-2');
        $this->senior('OSCA-3', ['atm_account_last4' => '3333', 'status' => 'inactive']);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/payroll-batches', [
            'benefit_id' => $this->pension->id,
            'period_label' => 'Q1 2027',
        ])->assertCreated();

        $response->assertJsonCount(1, 'transactions')
            ->assertJsonPath('transactions.0.senior.osca_id_number', 'OSCA-1')
            ->assertJsonPath('transactions.0.bank_status', 'for_payroll')
            ->assertJsonPath('transactions.0.payout_method', 'atm');

        // The same period cannot be put on a second payroll.
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/payroll-batches', [
            'benefit_id' => $this->pension->id,
            'period_label' => 'Q1 2027',
        ])->assertStatus(422);
    }

    public function test_full_flow_from_payroll_to_bsca_confirmation(): void
    {
        $this->senior('OSCA-1', ['atm_account_last4' => '1111']);
        $this->senior('OSCA-2', ['atm_account_last4' => '2222']);
        $batchId = $this->actingAs($this->admin, 'sanctum')->postJson('/api/payroll-batches', [
            'benefit_id' => $this->pension->id,
            'period_label' => 'Q1 2027',
        ])->json('id');

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/payroll-batches/{$batchId}/crediting", ['results' => [['osca_id_number' => 'OSCA-1', 'credited' => true]]])
            ->assertStatus(422);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/payroll-batches/{$batchId}/sent", ['sent_at' => now()->toDateString(), 'bank_reference' => 'LBP-TR-001'])
            ->assertOk()
            ->assertJsonPath('status', 'sent_to_bank');

        $credited = BenefitTransaction::whereHas('senior', fn ($q) => $q->where('osca_id_number', 'OSCA-1'))->where('period_label', 'Q1 2027')->sole();
        // A BSCA President cannot confirm before the bank credits the account.
        $this->actingAs($this->leader, 'sanctum')->patchJson("/api/benefit-transactions/{$credited->id}", [
            'status' => 'released', 'amount' => 3000, 'period_label' => 'Q1 2027', 'date_distributed' => now()->toDateString(),
        ])->assertStatus(422);

        $this->actingAs($this->admin, 'sanctum')->post("/api/payroll-batches/{$batchId}/crediting", [
            'results' => [
                ['osca_id_number' => 'OSCA-1', 'credited' => '1'],
                ['osca_id_number' => 'OSCA-2', 'credited' => '0', 'reason' => 'Closed account'],
                ['osca_id_number' => 'OSCA-9', 'credited' => '1'],
            ],
            'report' => UploadedFile::fake()->create('crediting.pdf', 20, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('credited', 1)
            ->assertJsonPath('failed', 1)
            ->assertJsonPath('unmatched.0.osca_id_number', 'OSCA-9')
            ->assertJsonPath('batch.status', 'reconciled');

        $failed = BenefitTransaction::whereHas('senior', fn ($q) => $q->where('osca_id_number', 'OSCA-2'))->where('period_label', 'Q1 2027')->sole();
        $this->assertSame('crediting_failed', $failed->bank_status);
        $this->assertSame('failed', $failed->status);
        $this->assertSame('Closed account', $failed->bank_remarks);
        $this->assertNotNull(PayrollBatch::find($batchId)->crediting_report_path);

        $this->actingAs($this->leader, 'sanctum')->patchJson("/api/benefit-transactions/{$credited->id}", [
            'status' => 'released', 'amount' => 3000, 'period_label' => 'Q1 2027', 'date_distributed' => now()->toDateString(),
        ])->assertOk();
        $this->assertSame('released', $credited->fresh()->status);
    }

    public function test_only_draft_payrolls_can_be_deleted(): void
    {
        $this->senior('OSCA-1', ['atm_account_last4' => '1111']);
        $batchId = $this->actingAs($this->admin, 'sanctum')->postJson('/api/payroll-batches', [
            'benefit_id' => $this->pension->id,
            'period_label' => 'Q1 2027',
        ])->json('id');

        $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/payroll-batches/{$batchId}")->assertNoContent();
        $this->assertSame(0, BenefitTransaction::where('period_label', 'Q1 2027')->count());
    }

    public function test_leaders_and_heads_cannot_manage_payrolls(): void
    {
        $head = User::factory()->create(['role' => 'head', 'status' => 'active']);
        $body = ['benefit_id' => $this->pension->id, 'period_label' => 'Q1 2027'];

        $this->actingAs($this->leader, 'sanctum')->getJson('/api/payroll-batches')->assertForbidden();
        $this->actingAs($this->leader, 'sanctum')->postJson('/api/payroll-batches', $body)->assertForbidden();
        $this->actingAs($head, 'sanctum')->getJson('/api/payroll-batches')->assertOk();
        $this->actingAs($head, 'sanctum')->postJson('/api/payroll-batches', $body)->assertForbidden();
    }
}
