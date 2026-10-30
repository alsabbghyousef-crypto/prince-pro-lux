<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        "name",
        "model",
        "color",
        "price",
        "cost_price",
        "currency",
        "units_per_carton",
        "category_id",
        "image",
        "stock",
        "min_threshold",
        "track_stock",
        "is_estimated",
        "cogs_percentage",
        "kitchen_reset_at",
    ];

    protected $casts = [
        "price" => "decimal:2",
        "cost_price" => "decimal:2",
        "stock" => "decimal:2",
        "min_threshold" => "decimal:2",
        "track_stock" => "boolean",
        "is_estimated" => "boolean",
        "cogs_percentage" => "decimal:2",
        "kitchen_reset_at" => "datetime",
    ];

    protected $appends = [
        'reorder_level'
    ];

    public function getReorderLevelAttribute()
    {
        return (float) ($this->min_threshold ?? 5);
    }

    public function setReorderLevelAttribute($value)
    {
        $this->attributes['min_threshold'] = $value;
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function restocks(): HasMany
    {
        return $this->hasMany(ProductRestock::class);
    }
}
