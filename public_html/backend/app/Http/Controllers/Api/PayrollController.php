<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Models\SalaryPayment;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function getEmployeeData($userId)
    {
        $leaves = Leave::where('user_id', $userId)->orderBy('start_date', 'desc')->get();
        $payments = SalaryPayment::where('user_id', $userId)->orderBy('date', 'desc')->get();
        return response()->json(['leaves' => $leaves, 'payments' => $payments]);
    }

    public function storeLeave(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'is_paid' => 'required|boolean',
            'reason' => 'nullable|string'
        ]);
        $leave = Leave::create($validated);
        return response()->json($leave, 201);
    }
    
    public function deleteLeave($id) {
        Leave::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }

    public function storePayment(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:1',
            'type' => 'required|in:ADVANCE,SALARY',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer',
            'date' => 'required|date',
            'notes' => 'nullable|string'
        ]);

        DB::beginTransaction();
        try {
            $payment = SalaryPayment::create($validated);
            
            // Automatically record an Expense Transaction
            $user = User::find($request->user_id);
            Transaction::create([
                'type' => 'EXPENSE',
                'category' => 'رواتب وسلف',
                'amount' => $request->amount,
                'date' => $request->date,
                'reference_id' => (string) $user->id,
                'notes' => ($request->type === 'ADVANCE' ? 'سلفة - ' : 'راتب - ') . $user->name . ($request->notes ? ' - ' . $request->notes : '')
            ]);
            
            DB::commit();
            return response()->json($payment, 201);
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    
    public function deletePayment($id) {
        SalaryPayment::destroy($id);
        return response()->json(['message' => 'Deleted']);
    }
}
