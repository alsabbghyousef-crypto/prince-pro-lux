<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();
        $weekAgo = Carbon::today()->subDays(6)->startOfDay();
        
        $globalExchangeRate = (float)(\App\Models\Setting::where('key', 'exchange_rate')->first()->value ?? 15000);
        if ($globalExchangeRate <= 0) $globalExchangeRate = 15000;

        $allOrders = Order::with('items')
            ->where('status', 'COMPLETED')
            ->whereBetween('created_at', [$weekAgo, Carbon::now()])
            ->get();

        $ordersCount = $allOrders->count();
        
        $totalSalesUsd = (float) $allOrders->sum('total');
        $totalSalesSyp = (float) $allOrders->sum('total_syp');
        
        $totalCostsSyp = 0;
        foreach($allOrders as $order) {
            foreach($order->items as $item) {
                $totalCostsSyp += (float)$item->cost_at_sale_syp * ((float)$item->quantity - (float)$item->returned_quantity);
            }
        }
        $totalCostsUsd = $totalCostsSyp / $globalExchangeRate;

        // Total Expenses
        $expenses = \App\Models\Transaction::where('type', 'EXPENSE')
            ->whereBetween('created_at', [$weekAgo, Carbon::now()])
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

        // Daily Chart
        $dailySalesQuery = Order::where('status', 'COMPLETED')
            ->whereBetween('created_at', [$weekAgo, Carbon::now()])
            ->selectRaw('DATE(created_at) as date, SUM(total) as sum_usd, SUM(total_syp) as sum_syp')
            ->groupBy('date')
            ->get()
            ->keyBy('date')
            ->toArray();

        $dailyExpensesQuery = \App\Models\Transaction::where('type', 'EXPENSE')
            ->whereBetween('created_at', [$weekAgo, Carbon::now()])
            ->get()
            ->groupBy(function($item) {
                return Carbon::parse($item->created_at)->format('Y-m-d');
            })
            ->map(function($dayExpenses) use ($globalExchangeRate) {
                $syp = 0;
                $usd = 0;
                foreach($dayExpenses as $exp) {
                    if (($exp->currency ?? 'SYP') === 'USD') {
                        $usd += (float)$exp->amount;
                        $syp += (float)$exp->amount * $globalExchangeRate;
                    } else {
                        $syp += (float)$exp->amount;
                        $usd += (float)$exp->amount / $globalExchangeRate;
                    }
                }
                return ['sum_syp' => $syp, 'sum_usd' => $usd];
            })->toArray();

        $dailyChart = [];
        $dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

        for ($i = 6; $i >= 0; $i--) {
            $dateObj = Carbon::today()->subDays($i);
            $dateString = $dateObj->format('Y-m-d');
            
            $daySalesUsd = isset($dailySalesQuery[$dateString]) ? (float) $dailySalesQuery[$dateString]['sum_usd'] : 0;
            $daySalesSyp = isset($dailySalesQuery[$dateString]) ? (float) $dailySalesQuery[$dateString]['sum_syp'] : 0;
            
            $dayExpensesSyp = isset($dailyExpensesQuery[$dateString]) ? (float) $dailyExpensesQuery[$dateString]['sum_syp'] : 0;
            $dayExpensesUsd = isset($dailyExpensesQuery[$dateString]) ? (float) $dailyExpensesQuery[$dateString]['sum_usd'] : 0;
            
            $dailyChart[] = [
                'date'     => $dayNames[$dateObj->dayOfWeek],
                'sales_usd'    => $daySalesUsd,
                'sales_syp'    => $daySalesSyp,
                'expenses_usd' => $dayExpensesUsd,
                'expenses_syp' => $dayExpensesSyp,
            ];
        }

        return response()->json([
            'usd' => [
                'total_sales'    => $totalSalesUsd,
                'total_costs'    => $totalCostsUsd,
                'total_expenses' => $totalExpensesUsd,
                'net_profit'     => $netProfitUsd,
            ],
            'syp' => [
                'total_sales'    => $totalSalesSyp,
                'total_costs'    => $totalCostsSyp,
                'total_expenses' => $totalExpensesSyp,
                'net_profit'     => $netProfitSyp,
            ],
            'orders_count'   => $ordersCount,
            'recent_orders'  => $recentOrders->map(fn($o) => [
                'id'         => $o->id,
                'total_usd'  => (float) $o->total,
                'total_syp'  => (float) $o->total_syp,
                'currency'   => $o->currency,
                'created_at' => $o->created_at,
            ]),
            'daily_chart'    => $dailyChart,
        ]);
    }

}
