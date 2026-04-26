<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Transaction;
use App\Models\CustomerPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->query('search', '');
        
        $query = Customer::query();
        
        if (!empty($search)) {
            $query->where('name', 'like', '%' . $search . '%')
                  ->orWhere('phone', 'like', '%' . $search . '%');
        }

        $customers = $query->orderBy('name')->get();
        return response()->json($customers);
    }

    public function show($id)
    {
        $customer = Customer::with(['orders' => function($q) {
            $q->orderBy('created_at', 'desc')->with('items.product');
        }, 'payments' => function($q) {
            $q->orderBy('created_at', 'desc');
        }])->findOrFail($id);

        return response()->json($customer);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
        ]);

        $customer->update($request->only(['name', 'phone', 'address']));

        return response()->json($customer);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
        ]);

        $customer = Customer::create([
            'name' => $request->name,
            'phone' => $request->phone,
            'address' => $request->address,
            'total_debt' => 0,
        ]);

        return response()->json($customer, 201);
    }

    public function payDebt(Request $request, $id)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'currency' => 'nullable|in:SYP,USD',
            'notes' => 'nullable|string',
            'order_id' => 'nullable|exists:orders,id'
        ]);

        $customer = Customer::findOrFail($id);

        DB::transaction(function () use ($customer, $request) {
            CustomerPayment::create([
                'customer_id' => $customer->id,
                'amount' => $request->amount,
                'notes' => $request->notes . ($request->currency === 'USD' ? ' (USD)' : ''),
            ]);

            $currency = $request->currency ?? 'SYP';
            if ($currency === 'USD') {
                $customer->decrement('total_debt_usd', $request->amount);
            } else {
                $customer->decrement('total_debt', $request->amount);
            }

            // Register Debt Payment as Income in Treasury
            Transaction::create([
                'type' => 'INCOME',
                'category' => 'تسديد ديون',
                'amount' => $request->amount,
                'date' => \Carbon\Carbon::today()->toDateString(),
                'reference_id' => 'Customer #' . $customer->id . ($request->order_id ? ' - Order #' . $request->order_id : ''),
                'notes' => 'تسديد دين من العميل: ' . $customer->name . ($request->notes ? ' - ' . $request->notes : '') . ($request->order_id ? ' (عن فاتورة #' . $request->order_id . ')' : ''),
            ]);
            
            $paymentRemaining = $request->amount;
            
            if ($request->has('order_id') && !empty($request->order_id)) {
                $order = \App\Models\Order::where('customer_id', $customer->id)->findOrFail($request->order_id);
                if ($order->debt_amount <= $paymentRemaining) {
                    $paymentRemaining -= $order->debt_amount;
                    $order->paid_amount += $order->debt_amount;
                    $order->debt_amount = 0;
                } else {
                    $order->debt_amount -= $paymentRemaining;
                    $order->paid_amount += $paymentRemaining;
                    $paymentRemaining = 0;
                }
                $order->save();
            }
            
            // if any payment remaining, distribute to other oldest orders
            if ($paymentRemaining > 0) {
                $unpaidOrders = \App\Models\Order::where('customer_id', $customer->id)
                    ->where('debt_amount', '>', 0)
                    ->orderBy('created_at', 'asc')
                    ->get();
                    
                foreach ($unpaidOrders as $order) {
                    if ($paymentRemaining <= 0) break;
                    
                    if ($order->debt_amount <= $paymentRemaining) {
                        $paymentRemaining -= $order->debt_amount;
                        $order->paid_amount += $order->debt_amount;
                        $order->debt_amount = 0;
                        $order->save();
                    } else {
                        $order->debt_amount -= $paymentRemaining;
                        $order->paid_amount += $paymentRemaining;
                        $paymentRemaining = 0;
                        $order->save();
                    }
                }
            }

            $customer->total_debt -= $request->amount;

            // Prevent negative debt just in case
            if ($customer->total_debt < 0) {
                $customer->total_debt = 0;
            }
            $customer->save();
        });

        return response()->json($customer);
    }
}
