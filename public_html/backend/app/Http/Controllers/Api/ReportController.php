<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function inventoryReport(Request $request)
    {
        $scope = $request->query('scope', 'monthly'); // daily, weekly, monthly, yearly
        $dateStr = $request->query('date', Carbon::today()->toDateString());
        
        $refDate = Carbon::parse($dateStr);
        $startDate = clone $refDate;
        $endDate = clone $refDate;
        
        if ($scope === 'daily') {
            $startDate = $startDate->startOfDay();
            $endDate = $endDate->endOfDay();
        } elseif ($scope === 'weekly') {
            $startDate = $startDate->startOfWeek();
            $endDate = $endDate->endOfWeek();
        } elseif ($scope === 'monthly') {
            $startDate = $startDate->startOfMonth();
            $endDate = $endDate->endOfMonth();
        } elseif ($scope === 'yearly') {
            $startDate = $startDate->startOfYear();
            $endDate = $endDate->endOfYear();
        } else {
            // all
            $startDate = Carbon::create(2000, 1, 1);
            $endDate = Carbon::now();
        }

        $periodStr = $startDate->format('Y/n/j') . ' - ' . $endDate->format('Y/n/j');

        // Get all products
        $products = \App\Models\Product::with('category')->get();

        // Get order items in period
        $orderItems = \App\Models\OrderItem::whereHas('order', function ($query) use ($startDate, $endDate) {
            $query->whereBetween('created_at', [$startDate, $endDate]);
        })->get();

        // Get restocks in period
        $restocks = \App\Models\ProductRestock::whereBetween('created_at', [$startDate, $endDate])->get();

        // Group by product id and calculate detailed metrics
        $salesByProduct = $orderItems->groupBy('product_id')->map(function ($items) {
            $sold_quantity = $items->sum('quantity');
            $total_revenue = $items->sum(function($item) { return $item->price * $item->quantity; });
            $total_cost = $items->sum(function($item) { return $item->cost_at_sale_syp * $item->quantity; });
            return [
                'sold_quantity' => $sold_quantity,
                'total_revenue' => $total_revenue,
                'total_profit' => $total_revenue - $total_cost,
            ];
        });
        
        $restocksByProduct = $restocks->groupBy('product_id')->map(function ($items) {
            return $items->sum('quantity_added');
        });

        // Build report data
        $reportData = $products->map(function ($product) use ($salesByProduct, $restocksByProduct) {
            $stats = $salesByProduct->get($product->id, ['sold_quantity' => 0, 'total_revenue' => 0, 'total_profit' => 0]);
            $imported_quantity = $restocksByProduct->get($product->id, 0);
            
            return [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category ? $product->category->name : 'بدون فئة',
                'stock' => (float) $product->stock,
                'sold_quantity' => (int) $stats['sold_quantity'],
                'imported_quantity' => (int) $imported_quantity,
                'total_revenue' => (float) $stats['total_revenue'],
                'total_profit' => (float) $stats['total_profit'],
                'track_stock' => $product->track_stock,
            ];
        });

        // Sort descending by sold quantity
        $reportData = $reportData->sortByDesc('sold_quantity')->values();

        // Calculate stats
        $mostSold = $reportData->take(5); // Top 5
        
        // Least sold (but > 0)
        $soldProducts = $reportData->where('sold_quantity', '>', 0)->sortBy('sold_quantity')->values();
        $leastSold = $soldProducts->take(5); // Bottom 5 sold
        
        // Zero sales
        $zeroSales = $reportData->where('sold_quantity', 0)->values();

        return response()->json([
            'all_products' => $reportData,
            'most_sold' => $mostSold,
            'least_sold' => $leastSold,
            'zero_sales' => $zeroSales,
            'metrics' => [
                'total_items_sold' => $salesByProduct->sum('sold_quantity'),
                'total_products_active' => $soldProducts->count(),
                'total_products_idle' => $zeroSales->count(),
                'total_revenue' => $salesByProduct->sum('total_revenue'),
                'total_profit' => $salesByProduct->sum('total_profit'),
                'period_string' => $periodStr,
            ]
        ]);
    }


    public function revenueStream(Request $request)
    {
        $scope = $request->query('scope', 'monthly');
        $dateStr = $request->query('date', Carbon::today()->toDateString());
        
        $refDate = Carbon::parse($dateStr);
        $startDate = clone $refDate;
        $endDate = clone $refDate;
        
        if ($scope === 'daily') {
            $startDate = $startDate->startOfDay();
            $endDate = $endDate->endOfDay();
        } elseif ($scope === 'weekly') {
            $startDate = $startDate->startOfWeek();
            $endDate = $endDate->endOfWeek();
        } elseif ($scope === 'monthly') {
            $startDate = $startDate->startOfMonth();
            $endDate = $endDate->endOfMonth();
        } elseif ($scope === 'yearly') {
            $startDate = $startDate->startOfYear();
            $endDate = $endDate->endOfYear();
        } else {
            $startDate = clone $refDate->startOfDay();
            $endDate = clone $refDate->endOfDay();
        }

        $periodStr = $startDate->format('Y/n/j') . ' - ' . $endDate->format('Y/n/j');

        $globalExchangeRate = (float)(\App\Models\Setting::where('key', 'exchange_rate')->first()->value ?? 15000);
        if ($globalExchangeRate <= 0) $globalExchangeRate = 15000;

        // 1. Get Orders (Sales)
        $orders = \App\Models\Order::with(['customer', 'items'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get()
            ->map(function($order) {
                $exRate = (float)$order->exchange_rate;
                if ($exRate <= 0) $exRate = 15000;

                $revenue_syp = (float)$order->total_syp;
                $revenue_usd = (float)$order->total;

                $cash_syp = (float)$order->paid_syp + ((float)$order->paid_usd * $exRate);
                $cash_usd = $cash_syp / $exRate;
                
                $debtCurrency = $order->debt_currency ?? 'SYP';
                $debtAmount = (float)$order->debt_amount;
                $debt_syp = $debtCurrency === 'USD' ? $debtAmount * $exRate : $debtAmount;
                $debt_usd = $debt_syp / $exRate;
                
                $cost_syp = 0;
                if ($order->items) {
                    foreach($order->items as $item) {
                        $cost_syp += (float)$item->cost_at_sale_syp * ((float)$item->quantity - (float)$item->returned_quantity);
                    }
                }
                $cost_usd = $cost_syp / $exRate;

                $profit_syp = $revenue_syp - $cost_syp;
                $profit_usd = $revenue_usd - $cost_usd;

                $type = 'SALE'; // مبيعات

                return [
                    'id' => 'order-' . $order->id,
                    'type' => $type,
                    'category' => 'مبيعات',
                    'revenue_syp' => $revenue_syp,
                    'revenue_usd' => $revenue_usd,
                    'expense_syp' => 0,
                    'expense_usd' => 0,
                    'cost_syp' => $cost_syp,
                    'cost_usd' => $cost_usd,
                    'profit_syp' => $profit_syp,
                    'profit_usd' => $profit_usd,
                    'cash_syp' => $cash_syp,
                    'cash_usd' => $cash_usd,
                    'debt_syp' => $debt_syp,
                    'debt_usd' => $debt_usd,
                    'date' => clone $order->created_at,
                    'date_string' => $order->created_at->format('Y-m-d g:i A'),
                    'details' => 'طلب #' . $order->id . ($order->customer ? ' - ' . $order->customer->name : ''),
                ];
            });

        // 2. Get Debt Payments
        $payments = \App\Models\CustomerPayment::with('customer')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get()
            ->map(function($payment) use ($globalExchangeRate) {
                $amount_syp = (float)$payment->amount;
                $amount_usd = $amount_syp / $globalExchangeRate;
                return [
                    'id' => 'payment-' . $payment->id,
                    'type' => 'DEBT_PAYMENT',
                    'category' => 'تسديد ديون',
                    'revenue_syp' => 0,
                    'revenue_usd' => 0,
                    'expense_syp' => 0,
                    'expense_usd' => 0,
                    'cost_syp' => 0,
                    'cost_usd' => 0,
                    'profit_syp' => 0,
                    'profit_usd' => 0,
                    'cash_syp' => $amount_syp,
                    'cash_usd' => $amount_usd,
                    'debt_syp' => -$amount_syp,
                    'debt_usd' => -$amount_usd,
                    'date' => clone $payment->created_at,
                    'date_string' => $payment->created_at->format('Y-m-d g:i A'),
                    'details' => 'تسديد دفعة من: ' . ($payment->customer ? $payment->customer->name : 'عميل'),
                ];
            });

        // 3. Get Expenses
        $expenses = \App\Models\Transaction::where('type', 'EXPENSE')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get()
            ->map(function($expense) use ($globalExchangeRate) {
                if (($expense->currency ?? 'SYP') === 'USD') {
                    $amount_usd = (float)$expense->amount;
                    $amount_syp = $amount_usd * $globalExchangeRate;
                } else {
                    $amount_syp = (float)$expense->amount;
                    $amount_usd = $amount_syp / $globalExchangeRate;
                }
                return [
                    'id' => 'expense-' . $expense->id,
                    'type' => 'EXPENSE',
                    'category' => $expense->category ?: 'مصروفات',
                    'revenue_syp' => 0,
                    'revenue_usd' => 0,
                    'expense_syp' => $amount_syp,
                    'expense_usd' => $amount_usd,
                    'cost_syp' => 0,
                    'cost_usd' => 0,
                    'profit_syp' => -$amount_syp,
                    'profit_usd' => -$amount_usd,
                    'cash_syp' => -$amount_syp,
                    'cash_usd' => -$amount_usd,
                    'debt_syp' => 0,
                    'debt_usd' => 0,
                    'date' => clone $expense->created_at,
                    'date_string' => $expense->created_at->format('Y-m-d g:i A'),
                    'details' => $expense->notes ?: 'مصروف عام',
                ];
            });

        // Merge and sort
        $stream = collect($orders)->merge($payments)->merge($expenses)->sortByDesc('date')->values();

        $totalRevenue_syp = $stream->sum('revenue_syp');
        $totalExpense_syp = $stream->sum('expense_syp');
        $totalCost_syp = $stream->sum('cost_syp');
        $totalProfit_syp = $stream->sum('profit_syp');
        $totalCashIn_syp = $stream->where('cash_syp', '>', 0)->sum('cash_syp');
        $totalCashOut_syp = $stream->where('cash_syp', '<', 0)->sum(function($i){return abs($i['cash_syp']);});
        
        $totalRevenue_usd = $stream->sum('revenue_usd');
        $totalExpense_usd = $stream->sum('expense_usd');
        $totalCost_usd = $stream->sum('cost_usd');
        $totalProfit_usd = $stream->sum('profit_usd');
        $totalCashIn_usd = $stream->where('cash_usd', '>', 0)->sum('cash_usd');
        $totalCashOut_usd = $stream->where('cash_usd', '<', 0)->sum(function($i){return abs($i['cash_usd']);});

        return response()->json([
            'metrics' => [
                'syp' => [
                    'total_revenue' => $totalRevenue_syp,
                    'total_expense' => $totalExpense_syp,
                    'total_cost' => $totalCost_syp,
                    'net_profit' => $totalProfit_syp,
                    'total_cash_in' => $totalCashIn_syp,
                    'total_cash_out' => $totalCashOut_syp,
                ],
                'usd' => [
                    'total_revenue' => $totalRevenue_usd,
                    'total_expense' => $totalExpense_usd,
                    'total_cost' => $totalCost_usd,
                    'net_profit' => $totalProfit_usd,
                    'total_cash_in' => $totalCashIn_usd,
                    'total_cash_out' => $totalCashOut_usd,
                ]
            ],
            'records' => $stream
        ]);
    }

    public function index(Request $request)
    {
        $period = $request->query('period', 'monthly'); // daily, weekly, monthly
        
        $startDate = Carbon::now();
        if ($period === 'daily') $startDate = Carbon::today();
        elseif ($period === 'weekly') $startDate = Carbon::now()->startOfWeek();
        elseif ($period === 'monthly') $startDate = Carbon::now()->startOfMonth();

        // 1. Sales (Total Revenue)
        $totalSales = Order::where('created_at', '>=', $startDate)->sum('total_price');
        
        // 2. Expenses from Transactions
        $totalExpenses = Transaction::where('type', 'EXPENSE')
                            ->where('date', '>=', $startDate->toDateString())
                            ->sum('amount');
                            
        $netProfit = $totalSales - $totalExpenses;

        // 4. Sales Over Time (Chart Data)
        if ($period === 'daily') {
            $salesChart = Order::select(DB::raw('HOUR(created_at) as label'), DB::raw('SUM(total_price) as total'))
                               ->where('created_at', '>=', $startDate)
                               ->groupBy('label')
                               ->get();
        } else {
            $salesChart = Order::select(DB::raw('DATE(created_at) as label'), DB::raw('SUM(total_price) as total'))
                               ->where('created_at', '>=', $startDate)
                               ->groupBy('label')
                               ->get();
        }

        // 5. Top Selling Items
        $topItems = OrderItem::select('product_id', DB::raw('SUM(quantity) as qty'), DB::raw('SUM(total_price) as total'))
                             ->with('product')
                             ->where('created_at', '>=', $startDate)
                             ->groupBy('product_id')
                             ->orderBy('qty', 'desc')
                             ->take(5)
                             ->get()
                             ->map(function($item) {
                                 return [
                                     'name' => $item->product ? $item->product->name : 'Unknown',
                                     'qty' => $item->qty,
                                     'total' => $item->total
                                 ];
                             });

        return response()->json([
            'metrics' => [
                'total_sales' => $totalSales,
                'total_expenses' => $totalExpenses,
                'net_profit' => $netProfit,
            ],
            'chart_data' => $salesChart,
            'top_items' => $topItems
        ]);
    }
}
