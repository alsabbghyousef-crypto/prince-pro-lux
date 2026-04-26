<?php
use App\Models\Customer;
use App\Models\Order;

$customers = Customer::all();

foreach ($customers as $customer) {
    $currentDebt = $customer->total_debt;
    
    // Get all orders for this customer, newest first
    $orders = Order::where('customer_id', $customer->id)
        ->orderBy('created_at', 'desc')
        ->get();
        
    foreach ($orders as $order) {
        if ($currentDebt > 0) {
            $orderDebt = min($order->total, $currentDebt);
            $order->debt_amount = $orderDebt;
            $order->paid_amount = $order->total - $orderDebt;
            $currentDebt -= $orderDebt;
        } else {
            $order->debt_amount = 0;
            $order->paid_amount = $order->total;
        }
        $order->save();
    }
}
echo "Orders debt synchronized with customers successfully!";
