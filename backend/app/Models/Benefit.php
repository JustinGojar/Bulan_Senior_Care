<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Cache;

class Benefit extends Model
{
    use HasFactory;

    public const ACTIVE_LIST_CACHE_KEY = 'benefits:active';

    protected $fillable = ['benefit_name', 'benefit_type', 'min_age', 'max_age', 'amount', 'funding_source', 'schedule', 'description', 'status'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    protected static function booted(): void
    {
        $forgetList = static fn () => Cache::forget(self::ACTIVE_LIST_CACHE_KEY);
        static::saved($forgetList);
        static::deleted($forgetList);
    }

    public function seniors(): BelongsToMany
    {
        return $this->belongsToMany(SeniorCitizen::class, 'benefit_transactions')->withPivot(['amount', 'status', 'period_label', 'date_distributed']);
    }
}
