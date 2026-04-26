<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaction::orderBy('date', 'desc')->orderBy('id', 'desc');
        
        if ($request->has('month') && $request->has('year')) {
            $query->whereMonth('date', $request->month)
                  ->whereYear('date', $request->year);
        }
        
        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:INCOME,EXPENSE',
            'category' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'notes' => 'nullable|string',
            'currency' => 'nullable|in:SYP,USD'
        ]);
        
        if (!isset($validated['currency'])) {
            $validated['currency'] = 'SYP';
        }

        $transaction = Transaction::create($validated);
        return response()->json($transaction, 201);
    }
    
    public function destroy($id)
    {
        Transaction::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }
}
