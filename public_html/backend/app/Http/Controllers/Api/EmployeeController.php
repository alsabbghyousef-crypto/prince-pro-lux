<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Carbon\Carbon;

class EmployeeController extends Controller
{
    // --- Attendance Endpoints ---
    
    public function getAttendances(Request $request)
    {
        $query = Attendance::with('user')->orderBy('date', 'desc');
        
        if ($request->has('date')) {
            $query->whereDate('date', $request->date);
        }
        
        return response()->json($query->get());
    }

    public function recordAttendance(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'status' => 'required|in:PRESENT,ABSENT,LATE,HALF_DAY',
            'notes' => 'nullable|string',
        ]);

        $employee = User::find($request->employee_id);
        $date = $request->date;
        
        $checkInDatetime = $request->check_in ? Carbon::parse($date . ' ' . $request->check_in) : null;
        $checkOutDatetime = $request->check_out ? Carbon::parse($date . ' ' . $request->check_out) : null;
        
        // Calculate lateness
        $latenessMinutes = 0;
        if ($checkInDatetime && $employee->shift_start) {
            $expectedStart = Carbon::parse($date . ' ' . $employee->shift_start);
            if ($checkInDatetime->greaterThan($expectedStart)) {
                $latenessMinutes = $checkInDatetime->diffInMinutes($expectedStart);
            }
        }
        
        // Calculate early departure
        $earlyDepartureMinutes = 0;
        if ($checkOutDatetime && $employee->shift_end) {
            $expectedEnd = Carbon::parse($date . ' ' . $employee->shift_end);
            if ($checkOutDatetime->lessThan($expectedEnd)) {
                $earlyDepartureMinutes = $expectedEnd->diffInMinutes($checkOutDatetime);
            }
        }

        $attendance = Attendance::updateOrCreate(
            ['user_id' => $employee->id, 'date' => $date],
            [
                'check_in' => $checkInDatetime,
                'check_out' => $checkOutDatetime,
                'status' => $request->status,
                'lateness_minutes' => $latenessMinutes,
                'early_departure_minutes' => $earlyDepartureMinutes,
                'notes' => $request->notes,
            ]
        );

        return response()->json($attendance);
    }
    
    // API endpoint for Smart Alerts (Salaries due and Lateness)
    public function getAlerts()
    {
        $alerts = [];
        $today = Carbon::today();
        
        // 1. Salary alerts: check if today is the day they joined, or near it
        $employees = User::whereNotNull('join_date')->get();
        foreach ($employees as $emp) {
            $joinDate = Carbon::parse($emp->join_date);
            // If the day of month matches today's day of month
            if ($joinDate->day == $today->day) {
                $alerts[] = [
                    'type' => 'SALARY',
                    'title' => 'تذكير براتب',
                    'message' => 'راتب الموظف ' . $emp->name . ' يستحق اليوم (' . number_format($emp->salary) . ' ل.س).',
                    'employee_id' => $emp->id,
                    'date' => $today->toDateString()
                ];
            }
        }
        
        // 2. Attendance alerts: check who was late today
        $lateAttendances = Attendance::with('user')
            ->whereDate('date', $today)
            ->where('lateness_minutes', '>', 0)
            ->get();
            
        foreach ($lateAttendances as $att) {
            $alerts[] = [
                'type' => 'ATTENDANCE',
                'title' => 'تأخير',
                'message' => 'تأخر الموظف ' . $att->user->name . ' بمقدار ' . $att->lateness_minutes . ' دقيقة.',
                'employee_id' => $att->user_id,
                'date' => $today->toDateString()
            ];
        }

        // 3. Low stock and out-of-stock inventory alerts
        $lowStockProducts = \App\Models\Product::whereNotNull('stock')
            ->where(function($q) {
                $q->whereColumn('stock', '<=', 'min_threshold')
                  ->orWhere(function($sub) {
                      $sub->whereNull('min_threshold')->where('stock', '<=', 5);
                  });
            })
            ->get();

        foreach ($lowStockProducts as $p) {
            $threshold = (float)($p->min_threshold ?? 5);
            $stock = (float)$p->stock;
            if ($stock <= 0) {
                $alerts[] = [
                    'type' => 'STOCK_OUT',
                    'title' => 'نفاذ مخزون بالكامل',
                    'message' => "المنتج '{$p->name}' نفذ بالكامل من المخزون (0 قطعة)!",
                    'product_id' => $p->id,
                    'link' => '/dashboard/items?stockFilter=out_of_stock',
                    'date' => $today->toDateString()
                ];
            } else {
                $alerts[] = [
                    'type' => 'STOCK_LOW',
                    'title' => 'تنبيه حد إعادة الطلب',
                    'message' => "المنتج '{$p->name}' أوشك على النفاد (المتبقي: {$stock} قطعة، حد الطلب: {$threshold})",
                    'product_id' => $p->id,
                    'link' => '/dashboard/items?stockFilter=low_stock',
                    'date' => $today->toDateString()
                ];
            }
        }
        
        return response()->json($alerts);
    }
}
