<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataSheet extends Model
{
    protected $table = 'datasheets';

    protected $fillable = [
        'title',
        'original_name',
        'file_path',
        'file_type',
        'file_extension',
        'file_size',
        'category_id',
        'subcategory_id',
        'description',
        'tags',
        'downloads_count',
        'user_id',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'downloads_count' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(DataSheetCategory::class, 'category_id');
    }

    public function subcategory(): BelongsTo
    {
        return $this->belongsTo(DataSheetCategory::class, 'subcategory_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
