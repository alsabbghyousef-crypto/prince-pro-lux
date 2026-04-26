<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductRestock extends Model
{
    protected $fillable = [
        "product_id",
        "quantity_added",
        "cost_price",
        "sale_price",
        "currency",
    ];

    protected $casts = [
        "quantity_added" => "decimal:2",
        "cost_price" => "decimal:2",
        "sale_price" => "decimal:2",
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

