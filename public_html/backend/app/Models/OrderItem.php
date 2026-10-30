<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
        'returned_quantity',
        'price',
        'cost_at_sale_syp',
        'is_paid',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'quantity' => 'integer',
        'cost_at_sale_syp' => 'decimal:2',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
