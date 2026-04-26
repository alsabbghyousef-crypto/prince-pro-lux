<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    protected $fillable = [
        'name',
        'quantity',
        'unit',
        'min_threshold',
        'cost_price',           // Deprecated - kept for compatibility
        'average_cost_syp',     // NEW: متوسط التكلفة بالليرة
        'total_cost_syp',       // NEW: إجمالي التكلفة
        'last_cost_syp',        // NEW: آخر سعر شراء
        'last_purchase_id',     // NEW: آخر فاتورة
        'category',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'min_threshold' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'average_cost_syp' => 'decimal:2',
        'total_cost_syp' => 'decimal:2',
        'last_cost_syp' => 'decimal:2',
    ];

    public function recipes(): HasMany
    {
        return $this->hasMany(ProductRecipe::class);
    }

    public function purchases(): HasMany
    {
        return $this->hasMany(Purchase::class);
    }

    public function lastPurchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class, 'last_purchase_id');
    }
}
