<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->query('period', 'month'); // 'month', 'week', 'year', 'all'
        $year = (int) $request->query('year', Carbon::now()->year);

        $globalExchangeRate = (float)(Setting::where('key', 'exchange_rate')->first()->value ?? 13950);
        if ($globalExchangeRate <= 1) {
            $globalExchangeRate = (float)(Setting::where('key', 'current_exchange_rate')->first()->value ?? 13950);
        }
        if ($globalExchangeRate <= 1) $globalExchangeRate = 13950;

        // Determine timeframe for dashboard stats cards
        if ($period === 'week') {
            $startDate = Carbon::today()->subDays(6)->startOfDay();
            $endDate = Carbon::now();
        } elseif ($period === 'year') {
            $startDate = Carbon::today()->startOfYear();
            $endDate = Carbon::now();
        } elseif ($period === 'all') {
            $startDate = Carbon::create(2000, 1, 1);
            $endDate = Carbon::now();
        } else {
            // Default 'month': from 1st of current month
            $startDate = Carbon::today()->startOfMonth();
            $endDate = Carbon::now();
        }

        $periodOrders = Order::with(['items.product'])
            ->where('status', 'COMPLETED')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $ordersCount = $periodOrders->count();
        
        $totalSalesUsd = 0;
        $totalSalesSyp = 0;
        $totalCostsSyp = 0;

        foreach ($periodOrders as $order) {
            $rate = ($order->exchange_rate && $order->exchange_rate > 1) ? (float)$order->exchange_rate : $globalExchangeRate;
            if ($order->currency === 'USD') {
                $usd = (float)$order->total;
                $syp = ((float)$order->total_syp > $usd) ? (float)$order->total_syp : ($usd * $rate);
            } else {
                $syp = (float)($order->total_syp > 0 ? $order->total_syp : $order->total);
                $usd = $syp / $rate;
            }
            $totalSalesUsd += $usd;
            $totalSalesSyp += $syp;

            foreach ($order->items as $item) {
                $qty = (float)$item->quantity - (float)$item->returned_quantity;
                $cost = (float)$item->cost_at_sale_syp;
                if ($cost <= 0 && $item->product) {
                    $costUsd = (float)($item->product->cost_price ?: ($item->product->price * 0.8));
                    $cost = $costUsd * $rate;
                }
                $totalCostsSyp += $cost * $qty;
            }
        }
        $totalCostsUsd = $totalCostsSyp / $globalExchangeRate;

        // Period Expenses
        $expenses = Transaction::where('type', 'EXPENSE')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();
            
        $totalExpensesSyp = 0;
        $totalExpensesUsd = 0;
        foreach ($expenses as $exp) {
            if (($exp->currency ?? 'SYP') === 'USD') {
                $totalExpensesUsd += (float)$exp->amount;
                $totalExpensesSyp += (float)$exp->amount * $globalExchangeRate;
            } else {
                $totalExpensesSyp += (float)$exp->amount;
                $totalExpensesUsd += (float)$exp->amount / $globalExchangeRate;
            }
        }

        $netProfitSyp = $totalSalesSyp - $totalCostsSyp - $totalExpensesSyp;
        $netProfitUsd = $totalSalesUsd - $totalCostsUsd - $totalExpensesUsd;

        $recentOrders = Order::where('status', 'COMPLETED')
            ->orderByDesc('created_at')
            ->limit(8)
            ->get(['id', 'total', 'total_syp', 'currency', 'created_at']);

        // ── Monthly Chart (12 Months of the selected year with 100% precision) ──
        $yearOrders = Order::where('status', 'COMPLETED')
            ->whereYear('created_at', $year)
            ->get();

        $monthNames = [
            1 => ['short' => 'كانون 2', 'full' => 'كانون الثاني (يناير)'],
            2 => ['short' => 'شباط',   'full' => 'شباط (فبراير)'],
            3 => ['short' => 'آذار',   'full' => 'آذار (مارس)'],
            4 => ['short' => 'نيسان',  'full' => 'نيسان (أبريل)'],
            5 => ['short' => 'أيار',   'full' => 'أيار (مايو)'],
            6 => ['short' => 'حزيران', 'full' => 'حزيران (يونيو)'],
            7 => ['short' => 'تموز',   'full' => 'تموز (يوليو)'],
            8 => ['short' => 'آب',     'full' => 'آب (أغسطس)'],
            9 => ['short' => 'أيلول',  'full' => 'أيلول (سبتمبر)'],
            10 => ['short' => 'تشرين 1', 'full' => 'تشرين الأول (أكتوبر)'],
            11 => ['short' => 'تشرين 2', 'full' => 'تشرين الثاني (نوفمبر)'],
            12 => ['short' => 'كانون 1', 'full' => 'كانون الأول (ديسمبر)']
        ];

        $monthlyData = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthlyData[$m] = [
                'month'        => $m,
                'date'         => $monthNames[$m]['short'],
                'short_date'   => $monthNames[$m]['short'],
                'full_date'    => $monthNames[$m]['full'],
                'sales_usd'    => 0.0,
                'sales_syp'    => 0.0,
                'orders_count' => 0,
                'expenses_usd' => 0.0,
                'expenses_syp' => 0.0,
            ];
        }

        $yearTotalSalesUsd = 0;
        $yearTotalSalesSyp = 0;

        foreach ($yearOrders as $order) {
            $m = (int)Carbon::parse($order->created_at)->month;
            $rate = ($order->exchange_rate && $order->exchange_rate > 1) ? (float)$order->exchange_rate : $globalExchangeRate;
            
            if ($order->currency === 'USD') {
                $usd = (float)$order->total;
                $syp = $usd * $rate;
            } else {
                $syp = (float)($order->total_syp > 0 ? $order->total_syp : $order->total);
                $usd = $syp / $rate;
            }
            
            $monthlyData[$m]['sales_usd'] += $usd;
            $monthlyData[$m]['sales_syp'] += $syp;
            $monthlyData[$m]['orders_count'] += 1;

            $yearTotalSalesUsd += $usd;
            $yearTotalSalesSyp += $syp;
        }

        $yearExpenses = Transaction::where('type', 'EXPENSE')
            ->whereYear('created_at', $year)
            ->get();

        foreach ($yearExpenses as $exp) {
            $m = (int)Carbon::parse($exp->created_at)->month;
            if (($exp->currency ?? 'SYP') === 'USD') {
                $usd = (float)$exp->amount;
                $syp = $usd * $globalExchangeRate;
            } else {
                $syp = (float)$exp->amount;
                $usd = $syp / $globalExchangeRate;
            }
            $monthlyData[$m]['expenses_usd'] += $usd;
            $monthlyData[$m]['expenses_syp'] += $syp;
        }

        foreach ($monthlyData as &$md) {
            $md['sales_usd'] = round($md['sales_usd'], 2);
            $md['sales_syp'] = round($md['sales_syp'], 0);
            $md['expenses_usd'] = round($md['expenses_usd'], 2);
            $md['expenses_syp'] = round($md['expenses_syp'], 0);
        }
        unset($md);

        // Daily Chart for backwards compatibility
        $weekAgo = Carbon::today()->subDays(6)->startOfDay();
        $dailySalesQuery = Order::where('status', 'COMPLETED')
            ->whereBetween('created_at', [$weekAgo, Carbon::now()])
            ->selectRaw('DATE(created_at) as date, SUM(total) as sum_usd, SUM(total_syp) as sum_syp')
            ->groupBy('date')
            ->get()
            ->keyBy('date')
            ->toArray();

        $dailyChart = [];
        $dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        for ($i = 6; $i >= 0; $i--) {
            $dateObj = Carbon::today()->subDays($i);
            $dateString = $dateObj->format('Y-m-d');
            $daySalesUsd = isset($dailySalesQuery[$dateString]) ? (float) $dailySalesQuery[$dateString]['sum_usd'] : 0;
            $daySalesSyp = isset($dailySalesQuery[$dateString]) ? (float) $dailySalesQuery[$dateString]['sum_syp'] : 0;
            $dailyChart[] = [
                'date'         => $dayNames[$dateObj->dayOfWeek],
                'sales_usd'    => $daySalesUsd,
                'sales_syp'    => $daySalesSyp,
                'expenses_usd' => 0,
                'expenses_syp' => 0,
            ];
        }

        return response()->json([
            'period'         => $period,
            'year'           => $year,
            'usd' => [
                'total_sales'    => round($totalSalesUsd, 2),
                'total_costs'    => round($totalCostsUsd, 2),
                'total_expenses' => round($totalExpensesUsd, 2),
                'net_profit'     => round($netProfitUsd, 2),
            ],
            'syp' => [
                'total_sales'    => round($totalSalesSyp, 0),
                'total_costs'    => round($totalCostsSyp, 0),
                'total_expenses' => round($totalExpensesSyp, 0),
                'net_profit'     => round($netProfitSyp, 0),
            ],
            'orders_count'   => $ordersCount,
            'recent_orders'  => $recentOrders->map(fn($o) => [
                'id'         => $o->id,
                'total_usd'  => (float) $o->total,
                'total_syp'  => (float) $o->total_syp,
                'currency'   => $o->currency,
                'created_at' => $o->created_at,
            ]),
            'monthly_chart'  => array_values($monthlyData),
            'daily_chart'    => $dailyChart,
            'year_summary'   => [
                'year'             => $year,
                'total_sales_usd'  => round($yearTotalSalesUsd, 2),
                'total_sales_syp'  => round($yearTotalSalesSyp, 0),
                'orders_count'     => $yearOrders->count(),
            ]
        ]);
    }
}
