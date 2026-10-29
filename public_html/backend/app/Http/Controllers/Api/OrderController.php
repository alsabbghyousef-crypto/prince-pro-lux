<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Transaction;
use App\Models\Customer;
use App\Models\OrderItem;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['items.product', 'deliveryCompany', 'customer'])
            ->orderBy('created_at', 'desc');

        // فلترة التاريخ
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Pagination if requested
        if ($request->has('per_page')) {
            $perPage = (int) $request->per_page;
            $orders = $query->paginate($perPage);

            // Custom mapping for paginated result
            $orders->getCollection()->transform(function ($order) {
                return $this->formatOrder($order);
            });

            return response()->json($orders);
        }

                // Default behavior (All orders or Limit) for backward compatibility
        if (!$request->has('start_date') && !$request->has('end_date')) {
            $query->limit(200); // 🚀 اجعل الاستعلام أسرع بكثير (جلب أحدث 200 طلب فقط افتراضياً)
        }
        $orders = $query->get();

        $formatted = $orders->map(function ($order) {
            return $this->formatOrder($order);
        });

        return response()->json($formatted);
    }

    private function formatOrder($order)
    {
        return [
            'id' => (string) $order->id,
            'timestamp' => $order->created_at,
            'items' => $order->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'orderItemId' => $item->id,
                    'productId' => (string) $item->product_id,
                    'quantity' => $item->quantity,
                    'returned_quantity' => (int) $item->returned_quantity,
                    'price' => (float) $item->price,
                    'productName' => $item->product ? $item->product->name : 'Deleted Product',
                ];
            })->toArray(),
            'total' => (float) $order->total,
            'currency' => $order->currency,
            'status' => $order->status,
            'createdBy' => $order->created_by,
            'source' => $order->source,
            'deliveryCompanyId' => $order->delivery_company_id ? (string) $order->delivery_company_id : null,
            'isSettled' => (bool) $order->is_settled,
            'deliveryCompany' => $order->deliveryCompany, // Eager loaded info
            'customerName' => $order->customer_name,
            'paymentMethod' => $order->payment_method,
            'paidAmount' => (float) $order->paid_amount,
            'debtAmount' => (float) $order->debt_amount,
            'discountAmount' => (float) $order->discount_amount,
            'notes' => $order->notes
        ];
    }

    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.isPaid' => 'nullable|boolean',
            'total' => 'required|numeric|min:0',
            'currency' => 'required|in:SYP,USD',
            'debtCurrency' => 'nullable|in:SYP,USD',
            'source' => 'required|in:SHOP,MOTOBOX,DELIVERY_PARTNER',
            'deliveryCompanyId' => 'nullable|exists:delivery_companies,id',
            'createdBy' => 'nullable|string',
            'exchangeRate' => 'nullable|numeric|min:0',
            'customerName' => 'nullable|string',
            'customerId' => 'nullable|exists:customers,id',
            'paymentMethod' => 'nullable|string',
            'paidAmount' => 'nullable|numeric|min:0',
            'paidSyp' => 'nullable|numeric|min:0',
            'paidUsd' => 'nullable|numeric|min:0',
            'debtAmount' => 'nullable|numeric|min:0',
            'discountType' => 'nullable|string',
            'discountValue' => 'nullable|numeric|min:0',
            'discountAmount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $exchangeRate = $request->exchangeRate ?? (float) Setting::get('current_exchange_rate', 1);

            $totalSyp = $request->currency === 'USD'
                ? $request->total * $exchangeRate
                : $request->total;
                
            $customer = null;
            if ($request->filled('customerId')) {
                $customer = Customer::find($request->customerId);
            } elseif ($request->filled('customerName')) {
                // Check if customer with this name already exists to avoid duplicates
                $customer = Customer::firstOrCreate(
                    ['name' => $request->customerName],
                    [
                        'total_debt' => 0,
                        'phone' => $request->customerPhone ?? null,
                        'address' => $request->customerAddress ?? null,
                    ]
                );
            }

            $order = Order::create([
                'total' => $request->total,
                'total_syp' => $totalSyp,
                'currency' => $request->currency,
                'exchange_rate' => $exchangeRate,
                'status' => 'COMPLETED',
                'source' => $request->source,
                'delivery_company_id' => $request->deliveryCompanyId,
                'created_by' => $request->createdBy,
                'is_settled' => false,
                'is_locked' => false,
                'customer_id' => $customer ? $customer->id : null,
                'customer_name' => $customer ? $customer->name : null,
                'payment_method' => $request->paymentMethod ?? 'CASH',
                'paid_amount' => $request->paidAmount ?? $request->total,
                'debt_amount' => $request->debtAmount ?? 0,
                'debt_currency' => $request->debtCurrency ?? 'USD',
                'discount_type' => $request->discountType,
                'discount_value' => $request->discountValue ?? 0,
                'discount_amount' => $request->discountAmount ?? 0,
                'notes' => $request->notes,
            ]);

            if ($customer && $request->debtAmount > 0) {
                $debtCurr = $request->debtCurrency ?? 'USD';
                if ($debtCurr === 'USD') {
                    $customer->increment('total_debt_usd', $request->debtAmount);
                } else {
                    $customer->increment('total_debt', $request->debtAmount);
                }
            }

            foreach ($request->items as $item) {
                $product = Product::find($item['productId']);
                $costAtSale = 0; // Simplified after removing kitchen/finance

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['productId'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'cost_at_sale_syp' => $costAtSale,
                ]);

                // خصم من المخزون
                if ($product && $product->track_stock) {
                    if ($product->stock < $item['quantity']) {
                        DB::rollBack();
                        return response()->json([
                            'error' => 'لا يوجد مخزون كافٍ من: ' . $product->name . ' (المتوفر: ' . $product->stock . ')',
                            'available' => $product->stock,
                            'requested' => $item['quantity']
                        ], 400);
                    }
                    $product->stock -= $item['quantity'];
                    $product->save();
                }
            }

            // Register POS Sale as Income in Treasury (Multi-Currency)
            try {
                $paidUsdToRegister = $request->paidUsd ?? 0;
                $paidSypToRegister = $request->paidSyp ?? ($request->paidAmount ?? $request->total);

                if ($paidUsdToRegister > 0) {
                    Transaction::create([
                        'type' => 'INCOME',
                        'category' => 'مبيعات دولار',
                        'amount' => $paidUsdToRegister,
                        'currency' => 'USD',
                        'date' => \Carbon\Carbon::today()->toDateString(),
                        'reference_id' => 'Order #' . $order->id,
                        'notes' => 'بيع نقدي بالدولار' . ($customer ? ' - العميل: ' . $customer->name : ''),
                    ]);
                }
                if ($paidSypToRegister > 0) {
                    Transaction::create([
                        'type' => 'INCOME',
                        'category' => 'مبيعات سوري',
                        'amount' => $paidSypToRegister,
                        'currency' => 'SYP',
                        'date' => \Carbon\Carbon::today()->toDateString(),
                        'reference_id' => 'Order #' . $order->id,
                        'notes' => 'بيع نقدي بالسوري' . ($customer ? ' - العميل: ' . $customer->name : ''),
                    ]);
                }
            } catch (\Throwable $te) {
                \Illuminate\Support\Facades\Log::warning('Treasury transaction warning: ' . $te->getMessage());
            }

            DB::commit();
            return response()->json($order->load('items'), 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Order save error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'error' => 'تعذر إتمام الطلب: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(Order $order)
    {
        return response()->json($order->load(['items.product', 'deliveryCompany', 'customer']));
    }

    public function update(Request $request, Order $order)
    {
        // منع التعديل على الطلبات المقفلة
        if ($order->is_locked) {
            return response()->json([
                'message' => 'لا يمكن تعديل طلب مقفل'
            ], 403);
        }

        $request->validate([
            'total' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|in:SYP,USD',
            'status' => 'sometimes|in:COMPLETED,PENDING,CANCELLED',
            'source' => 'sometimes|in:SHOP,MOTOBOX,DELIVERY_PARTNER',
            'isSettled' => 'sometimes|boolean',
        ]);

        $oldTotal = $order->total;

        $order->update([
            'total' => $request->total ?? $order->total,
            'currency' => $request->currency ?? $order->currency,
            'status' => $request->status ?? $order->status,
            'source' => $request->source ?? $order->source,
            'is_settled' => $request->isSettled ?? $order->is_settled,
        ]);

        // Update treasury if total changed
        if ($request->has('total') && $request->total != $oldTotal) {
            $diff = $request->total - $oldTotal;
            $treasuryKey = 'treasury_' . strtolower($order->currency);
            $currentValue = (float) Setting::get($treasuryKey, 0);
            Setting::set($treasuryKey, $currentValue + $diff);
        }

        return response()->json($order);
    }

        public function returnItems(Request $request, Order $order)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.order_item_id' => 'required',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $totalRefund = 0;
        $totalRefundSyp = 0;

        foreach ($request->items as $returnItem) {
            $orderItem = OrderItem::where('id', $returnItem['order_item_id'])->where('order_id', $order->id)->first();
            // Fallback in case frontend sent product_id instead of order_item_id due to cache
            if (!$orderItem) {
                $orderItem = OrderItem::where('product_id', $returnItem['order_item_id'])->where('order_id', $order->id)->first();
            }
            if (!$orderItem) {
                return response()->json(['error' => 'عنصر غير موجود في هذا الطلب'], 400);
            }

            $remainingQuantity = $orderItem->quantity - $orderItem->returned_quantity;
            if ($returnItem['quantity'] > $remainingQuantity) {
                return response()->json(['error' => 'الكمية المرجعة أكبر من المتاحة'], 400);
            }

            // Update order item
            $orderItem->returned_quantity += $returnItem['quantity'];
            $orderItem->save();

            // Restore product stock
            $product = Product::find($orderItem->product_id);
            if ($product && $product->track_stock) {
                $product->stock += $returnItem['quantity'];
                $product->save();
            }

            $refundAmount = $returnItem['quantity'] * $orderItem->price;
            $totalRefund += $refundAmount;
            
            $refundSyp = $order->currency === 'USD' ? $refundAmount * $order->exchange_rate : $refundAmount;
            $totalRefundSyp += $refundSyp;
        }

        // We can deduct refund from treasury (simplified cash refund)
        $treasuryKey = 'treasury_' . strtolower($order->currency);
        $currentValue = (float) Setting::get($treasuryKey, 0);
        Setting::set($treasuryKey, $currentValue - $totalRefund);
        
        // Update Order total optionally (or keep total and rely on returned_quantity to calculate net)
        // For simplicity and to not break previous reports, keeping the order total but marking status if fully returned
        
        $allItemsReturned = true;
        foreach ($order->items as $item) {
            if ($item->quantity > $item->returned_quantity) {
                $allItemsReturned = false;
                break;
            }
        }
        
        if ($allItemsReturned) {
            $order->status = 'CANCELLED';
        } else {
            // Optional: You could add a 'PARTIALLY_RETURNED' status if it existed, but keeping COMPLETED is fine for now
        }
        $order->save();

        return response()->json([
            'message' => 'تم إرجاع البضاعة بنجاح',
            'refund_amount' => $totalRefund,
            'currency' => $order->currency
        ]);
    }

public function destroy(Order $order)
    {
        // منع حذف الطلبات المقفلة
        if ($order->is_locked) {
            return response()->json([
                'message' => 'لا يمكن حذف طلب مقفل'
            ], 403);
        }

        // Restore treasury
        $treasuryKey = 'treasury_' . strtolower($order->currency);
        $currentValue = (float) Setting::get($treasuryKey, 0);
        Setting::set($treasuryKey, $currentValue - $order->total);

        $order->delete();

        return response()->json(['message' => 'تم الحذف بنجاح']);
    }
}\Illuminate\Support\Facades\Log::info('Returning item:', );
            
