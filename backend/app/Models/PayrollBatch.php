<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One ATM payout sent to the bank: the list of seniors to credit for a benefit and period.
 * The portal cannot reach the bank, so every step is recorded by OSCA from the bank's documents.
 */
class PayrollBatch extends Model
{
    protected $fillable = [
        'batch_number', 'benefit_id', 'period_label', 'status', 'sent_at', 'bank_reference',
        'crediting_report_path', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return ['sent_at' => 'date'];
    }

    public function benefit(): BelongsTo
    {
        return $this->belongsTo(Benefit::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(BenefitTransaction::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
