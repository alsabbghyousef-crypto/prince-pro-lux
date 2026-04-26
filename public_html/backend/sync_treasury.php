<?php

use App\Models\Order;
use App\Models\Transaction;
use App\Models\CustomerPayment;
use Carbon\Carbon;

$orders = Order::all();
foreach($orders as $order) {
    $paidAmount = $order->paid_amount ?? $order->total;
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

$payments = CustomerPayment::with('customer')->get();
foreach($payments as $payment) {
    $exists = Transaction::where('reference_id', 'Customer Payment #' . $payment->id)->first();
    if (!$exists) {
        Transaction::create([
            'type' => 'INCOME',
            'category' => 'تسديد ديون',
            'amount' => $payment->amount,
            'date' => $payment->created_at ? $payment->created_at->toDateString() : Carbon::today()->toDateString(),
            'reference_id' => 'Customer Payment #' . $payment->id,
            'notes' => 'تسديد دين من العميل: ' . ($payment->customer ? $payment->customer->name : 'غير معروف') . ($payment->notes ? ' - ' . $payment->notes : ''),
            'created_at' => $payment->created_at,
            'updated_at' => $payment->updated_at
        ]);
    }
}
echo "Synced successfully.";
