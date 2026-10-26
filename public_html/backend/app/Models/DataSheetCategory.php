<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DataSheetCategory extends Model
{
    protected $table = 'datasheet_categories';

    protected $fillable = [
        'name',
        'parent_id',
        'icon',
        'description',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(DataSheetCategory::class, 'parent_id');
    }

    public function subcategories(): HasMany
    {
        return $this->hasMany(DataSheetCategory::class, 'parent_id')->withCount('datasheets');
    }

    public function datasheets(): HasMany
    {
        return $this->hasMany(DataSheet::class, 'category_id');
    }

    public function subcategoryDatasheets(): HasMany
    {
        return $this->hasMany(DataSheet::class, 'subcategory_id');
    }
}
