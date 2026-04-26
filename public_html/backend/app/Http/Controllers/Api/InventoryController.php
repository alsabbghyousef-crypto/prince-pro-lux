<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index()
    {
        $items = InventoryItem::all();

        // Transform to match frontend format
        $formatted = $items->map(function ($item) {
            return [
                'id' => (string) $item->id,
                'name' => $item->name,
                'quantity' => (float) $item->quantity,
                'unit' => $item->unit,
                'minThreshold' => (float) $item->min_threshold,
                'costPrice' => (float) $item->cost_price, // Deprecated
                'averageCostSyp' => (float) $item->average_cost_syp,
                'totalCostSyp' => (float) $item->total_cost_syp,
                'lastCostSyp' => (float) $item->last_cost_syp,
                'lastPurchaseId' => $item->last_purchase_id,
                'category' => $item->category,
            ];
        });

        return response()->json($formatted);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0',
            'unit' => 'required|string|max:50',
            'minThreshold' => 'nullable|numeric|min:0',
            'costPrice' => 'nullable|numeric|min:0',
            'category' => 'nullable|in:FRUIT,DAIRY,SWEETENER,OTHER',
        ]);

        $item = InventoryItem::create([
            'name' => $request->name,
            'quantity' => $request->quantity,
            'unit' => $request->unit,
            'min_threshold' => $request->minThreshold ?? 0,
            'cost_price' => $request->costPrice ?? 0,
            'category' => $request->category ?? 'OTHER',
        ]);

        return response()->json($item, 201);
    }

    public function show(InventoryItem $inventoryItem)
    {
        return response()->json($inventoryItem);
    }

    public function update(Request $request, InventoryItem $inventoryItem)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'quantity' => 'sometimes|numeric|min:0',
            'unit' => 'sometimes|string|max:50',
            'minThreshold' => 'nullable|numeric|min:0',
            'costPrice' => 'nullable|numeric|min:0',
            'category' => 'nullable|in:FRUIT,DAIRY,SWEETENER,OTHER',
        ]);

        // إذا تغيرت الكمية، عدّل التكلفة بنفس النسبة
        if ($request->has('quantity')) {
            $newQty = (float) $request->quantity;
            $oldQty = (float) $inventoryItem->quantity;

            if ($newQty <= 0) {
                $inventoryItem->total_cost_syp = 0;
                $inventoryItem->average_cost_syp = 0;
            } elseif ($oldQty > 0) {
                $ratio = $newQty / $oldQty;
                $inventoryItem->total_cost_syp = (float) $inventoryItem->total_cost_syp * $ratio;
            }
        }

        $inventoryItem->update([
            'name' => $request->name ?? $inventoryItem->name,
            'quantity' => $request->quantity ?? $inventoryItem->quantity,
            'unit' => $request->unit ?? $inventoryItem->unit,
            'min_threshold' => $request->minThreshold ?? $inventoryItem->min_threshold,
            'cost_price' => $request->costPrice ?? $inventoryItem->cost_price,
            'category' => $request->category ?? $inventoryItem->category,
        ]);

        return response()->json($inventoryItem);
    }

    public function destroy(InventoryItem $inventoryItem)
    {
        $inventoryItem->delete();

        return response()->json(['message' => 'تم الحذف بنجاح']);
    }

    public function updateQuantity(Request $request, InventoryItem $inventoryItem)
    {
        $request->validate([
            'quantity' => 'required|numeric|min:0',
        ]);

        $newQty = (float) $request->quantity;
        $oldQty = (float) $inventoryItem->quantity;

        if ($newQty <= 0) {
            // تصفير كامل
            $inventoryItem->quantity = 0;
            $inventoryItem->total_cost_syp = 0;
            $inventoryItem->average_cost_syp = 0;
        } elseif ($oldQty > 0) {
            // تعديل التكلفة بنفس النسبة
            $ratio = $newQty / $oldQty;
            $inventoryItem->quantity = $newQty;
            $inventoryItem->total_cost_syp = (float) $inventoryItem->total_cost_syp * $ratio;
            // المتوسط يبقى كما هو (total_cost تغير بنفس نسبة quantity)
        } else {
            // الكمية القديمة = 0، مجرد تحديث الكمية
            $inventoryItem->quantity = $newQty;
        }

        $inventoryItem->save();

        return response()->json($inventoryItem);
    }

    /**
     * إعادة حساب المتوسط المرجح لجميع المواد من الصفر (بناءً على الفواتير الفعلية)
     */
    public function recalculateAverages()
    {
        $items = InventoryItem::all();
        $recalculated = [];

        foreach ($items as $item) {
            // جلب جميع فواتير الشراء لهذه المادة
            $purchases = \App\Models\Purchase::where('inventory_item_id', $item->id)->get();

            $totalQty = 0;
            $totalCostSyp = 0;
            $lastCostSyp = 0;
            $lastPurchaseId = null;

            foreach ($purchases as $purchase) {
                $purchaseCostSyp = $purchase->currency === 'USD'
                    ? $purchase->total * $purchase->exchange_rate
                    : $purchase->total;

                $unitCostSyp = $purchase->currency === 'USD'
                    ? $purchase->unit_price * $purchase->exchange_rate
                    : $purchase->unit_price;

                $totalQty += $purchase->quantity;
                $totalCostSyp += $purchaseCostSyp;
                $lastCostSyp = $unitCostSyp;
                $lastPurchaseId = $purchase->id;
            }

            $avgCost = $totalQty > 0 ? $totalCostSyp / $totalQty : 0;

            // تحديث المادة
            $item->quantity = $totalQty;
            $item->total_cost_syp = $totalCostSyp;
            $item->average_cost_syp = $avgCost;
            $item->last_cost_syp = $lastCostSyp;
            $item->last_purchase_id = $lastPurchaseId;
            $item->save();

            $recalculated[] = [
                'name' => $item->name,
                'quantity' => $totalQty,
                'average_cost_syp' => round($avgCost, 2),
            ];
        }

        return response()->json([
            'message' => 'تم إعادة حساب المتوسط لجميع المواد',
            'items' => $recalculated
        ]);
    }
}
