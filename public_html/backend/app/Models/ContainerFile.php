<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContainerFile extends Model
{
    protected $table = 'container_files';

    protected $fillable = [
        'container_id',
        'title',
        'original_name',
        'file_path',
        'file_type',
        'file_extension',
        'file_size',
        'description',
        'downloads_count',
        'user_id',
    ];

    protected $casts = [
        'file_size'       => 'integer',
        'downloads_count' => 'integer',
    ];

    public function container(): BelongsTo
    {
        return $this->belongsTo(Container::class, 'container_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
