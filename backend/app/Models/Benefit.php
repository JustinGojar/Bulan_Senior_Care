<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Benefit extends Model
{
    use HasFactory;

    protected $fillable = ['benefit_name', 'benefit_type', 'min_age', 'max_age', 'amount', 'funding_source', 'schedule', 'description', 'status'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function seniors(): BelongsToMany
    {
        return $this->belongsToMany(SeniorCitizen::class, 'benefit_transactions')->withPivot(['amount', 'status', 'period_label', 'date_distributed']);
    }
}
