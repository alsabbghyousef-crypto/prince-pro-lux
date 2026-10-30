<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductRestock;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::with(['category'])->get();

        // Transform to match frontend format
        $formatted = $products->map(function ($product) {
            return [
                'id' => (string) $product->id,
                'name' => $product->name,
                'price' => (float) $product->price,
                'cost_price' => (float) $product->cost_price,
                'currency' => $product->currency,
                'units_per_carton' => $product->units_per_carton ? (int)$product->units_per_carton : null,
                'category' => $product->category ? $product->category->name : null,
                'category_id' => $product->category_id,
                'image' => $product->image,
                'stock' => (float) $product->stock,
                'min_threshold' => (float) ($product->min_threshold ?? 5),
                'reorder_level' => (float) ($product->min_threshold ?? 5),
                'trackStock' => (bool) $product->track_stock,
                'is_estimated' => (bool) $product->is_estimated,
                'cogs_percentage' => (float) $product->cogs_percentage,
                'recipe' => [],
            ];
        });

        return response()->json($formatted);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'model' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'units_per_carton' => 'nullable|integer|min:1',
            'category_id' => 'nullable|exists:categories,id',
            'image_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            
            'trackStock' => 'nullable|boolean',
            'stock' => 'nullable|numeric|min:0',
            'min_threshold' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'is_estimated' => 'nullable|boolean',
            'cogs_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $imagePath = null;
        if ($request->hasFile('image_file')) {
            $image = $request->file('image_file');
            $name = time().'.'.$image->getClientOriginalExtension();
            $destinationPath = public_path('/uploads/products');
            if (!file_exists($destinationPath)) {
                mkdir($destinationPath, 0777, true);
            }
            $image->move($destinationPath, $name);
            $imagePath = '/uploads/products/'.$name;
        }

        $product = Product::create([
            'name' => $request->name,
            'model' => $request->model,
            'color' => $request->color,
            'cost_price' => $request->cost_price,
            'currency' => $request->currency,
            'units_per_carton' => $request->units_per_carton,
            'price' => $request->price,
            'category_id' => $request->category_id,
            'image' => $imagePath,
            'track_stock' => true,
            'stock' => $request->stock ?? 0,
            'min_threshold' => $request->min_threshold ?? $request->reorder_level ?? 5,
            'is_estimated' => $request->is_estimated ?? false,
            'cogs_percentage' => $request->cogs_percentage ?? 45,
        ]);

        

        return response()->json($product->load('category'), 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load(['category']));
    }

    public function update(Request $request, Product $product)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'model' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:255',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'units_per_carton' => 'nullable|integer|min:1',
            'category_id' => 'nullable|exists:categories,id',
            'image_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            
            'trackStock' => 'nullable|boolean',
            'stock' => 'nullable|numeric|min:0',
            'min_threshold' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'is_estimated' => 'nullable|boolean',
            'cogs_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $imagePath = $product->image;
        if ($request->hasFile('image_file')) {
            $image = $request->file('image_file');
            $name = time().'.'.$image->getClientOriginalExtension();
            $destinationPath = public_path('/uploads/products');
            if (!file_exists($destinationPath)) {
                mkdir($destinationPath, 0777, true);
            }
            $image->move($destinationPath, $name);
            $imagePath = '/uploads/products/'.$name;
        }

        $product->update([
            'name' => $request->name,
            'model' => $request->model,
            'color' => $request->color,
            'cost_price' => $request->cost_price,
            'currency' => $request->currency,
            'units_per_carton' => $request->units_per_carton,
            'price' => $request->price,
            'category_id' => $request->category_id,
            'image' => $imagePath,
            'track_stock' => true,
            'stock' => $request->has('stock') ? $request->stock : $product->stock,
            'min_threshold' => $request->has('min_threshold') ? $request->min_threshold : ($request->has('reorder_level') ? $request->reorder_level : $product->min_threshold),
            'is_estimated' => $request->has('is_estimated') ? $request->is_estimated : $product->is_estimated,
            'cogs_percentage' => $request->has('cogs_percentage') ? $request->cogs_percentage : $product->cogs_percentage,
        ]);

        

        return response()->json($product->load('category'));
    }

    
    public function updateStock(Request $request, Product $product)
    {
        $request->validate([
            'stock' => 'required|numeric|min:0'
        ]);
        $product->stock = $request->stock;
        $product->save();
        return response()->json($product);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(['message' => 'تم الحذف بنجاح']);
    }

    
    public function profile(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        $restocksQuery = ProductRestock::where('product_id', $id);
        $salesQuery = \App\Models\OrderItem::with('order')->where('product_id', $id);

        if ($request->has('start_date') && $request->start_date) {
            $start = \Carbon\Carbon::parse($request->start_date)->startOfDay();
            $restocksQuery->where('created_at', '>=', $start);
            $salesQuery->where('created_at', '>=', $start);
        }
        if ($request->has('end_date') && $request->end_date) {
            $end = \Carbon\Carbon::parse($request->end_date)->endOfDay();
            $restocksQuery->where('created_at', '<=', $end);
            $salesQuery->where('created_at', '<=', $end);
        }

        $restocks = $restocksQuery->orderBy('created_at', 'desc')->get();
        
        $sales = $salesQuery->orderBy('created_at', 'desc')->get()->map(function($item) {
            return [
                'id' => $item->id,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'created_at' => $item->created_at,
                'customer_name' => $item->order ? $item->order->customer_name : null,
                'order_id' => $item->order_id
            ];
        });

        return response()->json([
            'product' => $product,
            'restocks' => $restocks,
            'sales' => $sales,
        ]);
    }

    public function bulkStore(Request $request)
    {
        $request->validate([
            'products' => 'required|array',
            'products.*.name' => 'required|string|max:255',
            'products.*.model' => 'nullable|string|max:255',
            'products.*.color' => 'nullable|string|max:255',
            'products.*.price' => 'required|numeric|min:0',
            'products.*.cost_price' => 'nullable|numeric|min:0',
            'products.*.currency' => 'nullable|string|max:10',
            'products.*.stock' => 'nullable|numeric|min:0',
        ]);

        $created = [];
        \Illuminate\Support\Facades\DB::transaction(function () use ($request, &$created) {
            foreach ($request->products as $p) {
                $product = Product::where('name', $p['name'])->first();
                if ($product) {
                    $addedStock = $p['stock'] ?? 0;
                    if ($addedStock > 0 || $product->price != $p['price'] || $product->cost_price != ($p['cost_price'] ?? 0)) {
                        ProductRestock::create([
                            'product_id' => $product->id,
                            'quantity_added' => $addedStock,
                            'cost_price' => $p['cost_price'] ?? 0,
                            'sale_price' => $p['price'],
                            'currency' => $p['currency'] ?? 'USD'
                        ]);
                    }
                    $product->update([
                        'model' => $p['model'] ?? $product->model,
                        'color' => $p['color'] ?? $product->color,
                        'cost_price' => $p['cost_price'] ?? $product->cost_price,
                        'currency' => $p['currency'] ?? $product->currency,
                        'price' => $p['price'],
                        'stock' => $product->stock + $addedStock,
                    ]);
                    $created[] = $product;
                } else {
                    $newProduct = Product::create([
                        'name' => $p['name'],
                        'model' => $p['model'] ?? null,
                        'color' => $p['color'] ?? null,
                        'cost_price' => $p['cost_price'] ?? 0,
                        'currency' => $p['currency'] ?? 'USD', 
                        'price' => $p['price'],
                        'category_id' => $p['category_id'] ?? null,
                        'track_stock' => true,
                        'stock' => $p['stock'] ?? 0,
                        'is_estimated' => false,
                        'cogs_percentage' => 45,
                    ]);
                    if (($p['stock'] ?? 0) > 0) {
                        ProductRestock::create([
                            'product_id' => $newProduct->id,
                            'quantity_added' => $p['stock'] ?? 0,
                            'cost_price' => $p['cost_price'] ?? 0,
                            'sale_price' => $p['price'],
                            'currency' => $p['currency'] ?? 'USD'
                        ]);
                    }
                    $created[] = $newProduct;
                }
            }
        });

        return response()->json($created);
    }

    public function bulkDelete(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:products,id'
        ]);

        \App\Models\Product::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'تم الحذف بنجاح']);
    }
}
