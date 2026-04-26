<?php

use App\Models\Order;
use App\Models\Transaction;
use App\Models\CustomerPayment;
use Carbon\Carbon;

$orders = Order::all();
foreach($orders as $order) {
    // Calculate the real paid amount.
    // If paid_amount is explicitly set to > 0, use it.
    // If it is 0 but debt is also 0, it means legacy cash sale => paid = total.
    $paidAmount = (float)$order->paid_amount;
    $debtAmount = (float)$order->debt_amount;
    
    if ($paidAmount == 0 && $debtAmount == 0) {
        $paidAmount = (float)$order->total;
    }
    
    if ($paidAmount > 0) {
        $exists = Transaction::where('reference_id', 'Order #' . $order->id)->first();
        if (!$exists) {
            Transaction::create([
                'type' => 'INCOME',
                'category' => 'مبيعات',
                'amount' => $paidAmount,
                'date' => $order->created_at ? $order->created_at->toDateString() : Carbon::today()->toDateString(),
                'reference_id' => 'Order #' . $order->id,
                'notes' => 'بيع نقدي من نقطة البيع' . ($order->customer_name ? ' - العميل: ' . $order->customer_name : ''),
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at
            ]);
        }
    }
}
echo "Fixed missing legacy transactions!";
