<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Container extends Model
{
    protected $table = 'containers';

    protected $fillable = [
        'container_number',
        'title',
        'status',
        'supplier',
        'origin',
        'shipping_date',
        'arrival_date',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'shipping_date' => 'date:Y-m-d',
        'arrival_date'  => 'date:Y-m-d',
    ];

    protected $appends = [
        'files_count',
        'total_files_size',
    ];

    public function files(): HasMany
    {
        return $this->hasMany(ContainerFile::class, 'container_id')->latest();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getFilesCountAttribute(): int
    {
        return $this->relationLoaded('files') ? $this->files->count() : $this->files()->count();
    }

    public function getTotalFilesSizeAttribute(): int
    {
        return $this->relationLoaded('files') ? (int) $this->files->sum('file_size') : (int) $this->files()->sum('file_size');
    }
}
