<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'amount', 'type', 'month', 'year', 'date', 'notes'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
