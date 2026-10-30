<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
        protected $fillable = [
        'total',
        'total_syp',
        'currency',
        'exchange_rate',
        'status',
        'source',
        'delivery_company_id',
        'is_settled',
        'is_locked',
        'locked_at',
        'user_id',
        'customer_name',
        'customer_id',
        'discount_type',
        'discount_value',
        'discount_amount',
        'payment_method',
        'paid_amount',
        'paid_usd',
        'paid_syp',
        'debt_amount',
        'debt_currency',
        'notes',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'total_syp' => 'decimal:2',
        'paid_usd' => 'decimal:2',
        'paid_syp' => 'decimal:2',
        'exchange_rate' => 'decimal:2',
        'is_settled' => 'boolean',
        'is_locked' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function deliveryCompany(): BelongsTo
    {
        return $this->belongsTo(DeliveryCompany::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
