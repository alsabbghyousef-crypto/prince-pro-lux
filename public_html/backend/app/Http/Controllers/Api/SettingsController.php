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
        $incomesUsd = Transaction::where('type', 'INCOME')->where('currency', 'USD')->sum('amount');
        $expensesUsd = Transaction::where('type', 'EXPENSE')->where('currency', 'USD')->sum('amount');
        $treasuryUsd = $incomesUsd - $expensesUsd;

        $incomesSyp = Transaction::where('type', 'INCOME')->where(function($q) {
            $q->where('currency', 'SYP')->orWhereNull('currency');
        })->sum('amount');
        $expensesSyp = Transaction::where('type', 'EXPENSE')->where(function($q) {
            $q->where('currency', 'SYP')->orWhereNull('currency');
        })->sum('amount');
        $treasurySyp = $incomesSyp - $expensesSyp;

        return [
            'usd' => (float) $treasuryUsd,
            'syp' => (float) $treasurySyp,
        ];
    }

    public function index()
    {
        $exchangeRate = Setting::get('exchange_rate', 13800);
        $appName      = Setting::get('app_name', 'Prince Pro Lux');
        
        // POS Settings
        $posDefaultCurrency    = Setting::get('pos_default_currency', 'USD');
        $posDefaultPayment     = Setting::get('pos_default_payment', 'CASH');
        $posAllowNegativeStock = Setting::get('pos_allow_negative_stock', '0') === '1';
        $posLowStockThreshold  = (int) Setting::get('pos_low_stock_threshold', 5);

        // Receipt & Printing Settings
        $receiptAutoPrint          = Setting::get('receipt_auto_print', '0') === '1';
        $receiptPaperSize          = Setting::get('receipt_paper_size', '80mm');
        $receiptShowDualCurrency   = Setting::get('receipt_show_dual_currency', '1') !== '0';
        $receiptFooterNote         = Setting::get('receipt_footer_note', 'شكراً لتعاملكم مع Prince Pro Lux - البضاعة المباعة تستبدل خلال 3 أيام بشرط وجود الفاتورة وبحالتها الأصلية');

        // Currency & Pricing Rules
        $sypRoundingRule           = Setting::get('syp_rounding_rule', '500');

        // System Experience & Security
        $soundEffectsEnabled       = Setting::get('sound_effects_enabled', '1') !== '0';
        $confirmOrderCancel        = Setting::get('confirm_order_cancel', '1') !== '0';
        $cartAutosave              = Setting::get('cart_autosave', '1') !== '0';

        $treasury = $this->calculateTreasury();

        return response()->json([
            'exchangeRate'            => (float) $exchangeRate,
            'appName'                 => $appName,
            'posDefaultCurrency'      => $posDefaultCurrency,
            'posDefaultPayment'       => $posDefaultPayment,
            'posAllowNegativeStock'   => $posAllowNegativeStock,
            'posLowStockThreshold'    => $posLowStockThreshold,
            'receiptAutoPrint'        => $receiptAutoPrint,
            'receiptPaperSize'        => $receiptPaperSize,
            'receiptShowDualCurrency' => $receiptShowDualCurrency,
            'receiptFooterNote'       => $receiptFooterNote,
            'sypRoundingRule'         => $sypRoundingRule,
            'soundEffectsEnabled'     => $soundEffectsEnabled,
            'confirmOrderCancel'      => $confirmOrderCancel,
            'cartAutosave'            => $cartAutosave,
            'treasury'                => $treasury,
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'exchangeRate'            => 'nullable|numeric|min:0',
            'posDefaultCurrency'      => 'nullable|string|in:USD,SYP',
            'posDefaultPayment'       => 'nullable|string|in:CASH,DEBT',
            'posAllowNegativeStock'   => 'nullable|boolean',
            'posLowStockThreshold'    => 'nullable|integer|min:0|max:1000',
            'receiptAutoPrint'        => 'nullable|boolean',
            'receiptPaperSize'        => 'nullable|string|in:80mm,58mm,A4',
            'receiptShowDualCurrency' => 'nullable|boolean',
            'receiptFooterNote'       => 'nullable|string|max:500',
            'sypRoundingRule'         => 'nullable|string|in:none,100,500,1000',
            'soundEffectsEnabled'     => 'nullable|boolean',
            'confirmOrderCancel'      => 'nullable|boolean',
            'cartAutosave'            => 'nullable|boolean',
        ]);

        if ($request->has('exchangeRate')) {
            $this->updateExchangeRateInternal($request->exchangeRate, $request->user()?->id);
        }

        if ($request->has('posDefaultCurrency'))      Setting::set('pos_default_currency', $request->posDefaultCurrency);
        if ($request->has('posDefaultPayment'))       Setting::set('pos_default_payment', $request->posDefaultPayment);
        if ($request->has('posAllowNegativeStock'))   Setting::set('pos_allow_negative_stock', $request->posAllowNegativeStock ? '1' : '0');
        if ($request->has('posLowStockThreshold'))    Setting::set('pos_low_stock_threshold', (string)$request->posLowStockThreshold);
        if ($request->has('receiptAutoPrint'))        Setting::set('receipt_auto_print', $request->receiptAutoPrint ? '1' : '0');
        if ($request->has('receiptPaperSize'))        Setting::set('receipt_paper_size', $request->receiptPaperSize);
        if ($request->has('receiptShowDualCurrency')) Setting::set('receipt_show_dual_currency', $request->receiptShowDualCurrency ? '1' : '0');
        if ($request->has('receiptFooterNote'))       Setting::set('receipt_footer_note', $request->receiptFooterNote);
        if ($request->has('sypRoundingRule'))         Setting::set('syp_rounding_rule', $request->sypRoundingRule);
        if ($request->has('soundEffectsEnabled'))     Setting::set('sound_effects_enabled', $request->soundEffectsEnabled ? '1' : '0');
        if ($request->has('confirmOrderCancel'))      Setting::set('confirm_order_cancel', $request->confirmOrderCancel ? '1' : '0');
        if ($request->has('cartAutosave'))            Setting::set('cart_autosave', $request->cartAutosave ? '1' : '0');

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
