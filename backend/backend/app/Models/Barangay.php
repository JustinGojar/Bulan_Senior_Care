<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Barangay extends Model
{
    use HasFactory;

    protected $fillable = ['barangay_name', 'municipality', 'province', 'zone_number'];

    public function seniors(): HasMany
    {
        return $this->hasMany(SeniorCitizen::class);
    }
}
