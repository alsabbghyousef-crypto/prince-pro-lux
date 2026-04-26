<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Order;
use App\Models\Transaction;
use App\Models\ExchangeRateHistory;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    private function calculateTreasury()
    {
        // For now, we'll keep it simple and just use transactions
        $incomes = Transaction::where('type', 'INCOME')->sum('amount');
        $expenses = Transaction::where('type', 'EXPENSE')->sum('amount');

        // We assume transactions are in SYP since they don't have currency field currently.
        $treasurySyp = $incomes - $expenses;

        return [
            'usd' => 0, // Not explicitly tracked in transactions yet
            'syp' => (float) $treasurySyp,
        ];
    }

    public function index()
    {
        $exchangeRate = Setting::get('exchange_rate', 15200);
        $appName      = Setting::get('app_name', 'Prince Pro Lux');
        $cogsPercent  = Setting::get('cogs_percent', 45);
        $address      = Setting::get('address', '');
        $phone        = Setting::get('phone', '');
        $taxPercent   = Setting::get('tax_percent', 0);
        
        $treasury = $this->calculateTreasury();

        return response()->json([
            'exchangeRate' => (float) $exchangeRate,
            'appName'      => $appName,
            'cogsPercent'  => (float) $cogsPercent,
            'address'      => $address,
            'phone'        => $phone,
            'taxPercent'   => (float) $taxPercent,
            'treasury'     => $treasury,
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'exchangeRate' => 'nullable|numeric|min:0',
            'appName'      => 'nullable|string|max:100',
            'cogsPercent'  => 'nullable|numeric|min:0|max:100',
            'address'      => 'nullable|string|max:255',
            'phone'        => 'nullable|string|max:50',
            'taxPercent'   => 'nullable|numeric|min:0|max:100',
        ]);

        if ($request->has('exchangeRate')) {
            $this->updateExchangeRateInternal($request->exchangeRate, $request->user()?->id);
        }
        
        if ($request->has('appName'))      Setting::set('app_name', $request->appName);
        if ($request->has('cogsPercent'))  Setting::set('cogs_percent', $request->cogsPercent);
        if ($request->has('address'))      Setting::set('address', $request->address);
        if ($request->has('phone'))        Setting::set('phone', $request->phone);
        if ($request->has('taxPercent'))   Setting::set('tax_percent', $request->taxPercent);

        return $this->index();
    }

    private function updateExchangeRateInternal($rate, $userId = null) {
        Setting::set('exchange_rate', $rate);
        ExchangeRateHistory::create([
            'rate' => $rate,
            'user_id' => $userId
        ]);
    }

    public function getExchangeRate()
    {
        return response()->json([
            'exchangeRate' => (float) Setting::get('exchange_rate', 15200),
        ]);
    }

    public function updateExchangeRate(Request $request)
    {
        $request->validate([
            'exchangeRate' => 'required|numeric|min:0',
        ]);

        $this->updateExchangeRateInternal($request->exchangeRate, $request->user()?->id);

        return response()->json([
            'exchangeRate' => (float) $request->exchangeRate,
            'message' => 'تم تحديث سعر الصرف',
        ]);
    }

    public function getExchangeRateHistory(\Illuminate\Http\Request $request)
    {
        $history = ExchangeRateHistory::with('user:id,name')
                    ->orderBy('created_at', 'desc')
                    ->paginate($request->get('per_page', 20));
        return response()->json($history);
    }

    public function getTreasury()
    {
        return response()->json($this->calculateTreasury());
    }
}
