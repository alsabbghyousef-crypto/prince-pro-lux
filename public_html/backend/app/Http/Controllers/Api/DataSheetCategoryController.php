<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataSheetCategory;
use Illuminate\Http\Request;

class DataSheetCategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = DataSheetCategory::whereNull('parent_id')
            ->with(['subcategories' => function ($query) {
                $query->withCount(['subcategoryDatasheets as datasheets_count']);
            }])
            ->withCount('datasheets')
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:datasheet_categories,id',
            'icon' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:1000',
        ]);

        $category = DataSheetCategory::create($validated);

        if ($category->parent_id) {
            $category->load('parent');
        } else {
            $category->load('subcategories');
        }

        return response()->json($category, 201);
    }

    public function update(Request $request, $id)
    {
        $category = DataSheetCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:datasheet_categories,id',
            'icon' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:1000',
        ]);

        // Prevent self as parent
        if (isset($validated['parent_id']) && $validated['parent_id'] == $id) {
            return response()->json(['message' => 'لا يمكن للتصنيف أن يكون تصنيفاً فرعياً لنفسه.'], 422);
        }

        $category->update($validated);

        return response()->json($category);
    }

    public function destroy($id)
    {
        $category = DataSheetCategory::findOrFail($id);
        
        // If it's a parent category, delete subcategories as well
        DataSheetCategory::where('parent_id', $id)->delete();
        
        $category->delete();

        return response()->json(['message' => 'تم حذف التصنيف بنجاح.']);
    }
}
