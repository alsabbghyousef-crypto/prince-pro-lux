<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryCompany;
use Illuminate\Http\Request;

class DeliveryCompanyController extends Controller
{
    public function index()
    {
        $companies = DeliveryCompany::all();

        $formatted = $companies->map(function ($company) {
            return [
                'id' => (string) $company->id,
                'name' => $company->name,
                'commissionRate' => (float) $company->commission_rate,
                'isActive' => (bool) $company->is_active,
            ];
        });

        return response()->json($formatted);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'commissionRate' => 'required|numeric|min:0|max:100',
            'isActive' => 'nullable|boolean',
        ]);

        $company = DeliveryCompany::create([
            'name' => $request->name,
            'commission_rate' => $request->commissionRate,
            'is_active' => $request->isActive ?? true,
        ]);

        return response()->json($company, 201);
    }

    public function show(DeliveryCompany $deliveryCompany)
    {
        return response()->json($deliveryCompany);
    }

    public function update(Request $request, DeliveryCompany $deliveryCompany)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'commissionRate' => 'sometimes|numeric|min:0|max:100',
            'isActive' => 'nullable|boolean',
        ]);

        $deliveryCompany->update([
            'name' => $request->name ?? $deliveryCompany->name,
            'commission_rate' => $request->commissionRate ?? $deliveryCompany->commission_rate,
            'is_active' => $request->has('isActive') ? $request->isActive : $deliveryCompany->is_active,
        ]);

        return response()->json($deliveryCompany);
    }

    public function destroy(DeliveryCompany $deliveryCompany)
    {
        $deliveryCompany->delete();

        return response()->json(['message' => 'تم الحذف بنجاح']);
    }

    public function toggleStatus(DeliveryCompany $deliveryCompany)
    {
        $deliveryCompany->is_active = !$deliveryCompany->is_active;
        $deliveryCompany->save();

        return response()->json($deliveryCompany);
    }
}
