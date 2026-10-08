<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Cache;

class Barangay extends Model
{
    use HasFactory;

    public const LIST_CACHE_KEY = 'barangays:list';

    protected $fillable = ['barangay_name', 'municipality', 'province', 'zone_number'];

    protected static function booted(): void
    {
        $forgetList = static fn () => Cache::forget(self::LIST_CACHE_KEY);
        static::saved($forgetList);
        static::deleted($forgetList);
    }

    public function seniors(): HasMany
    {
        return $this->hasMany(SeniorCitizen::class);
    }

    public function benefitReleases(): BelongsToMany
    {
        return $this->belongsToMany(BenefitRelease::class);
    }
}
