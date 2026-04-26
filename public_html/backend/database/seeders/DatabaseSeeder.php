<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\ProductRecipe;
use App\Models\DeliveryCompany;
use App\Models\Setting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create Users
        User::create([
            'name' => 'باسل (مدير)',
            'email' => 'basel@newpower.com',
            'password' => Hash::make('12345678'),
            'role' => 'ADMIN',
        ]);

        User::create([
            'name' => 'محمد (بائع)',
            'email' => 'mohamed@newpower.com',
            'password' => Hash::make('12345678'),
            'role' => 'SELLER',
        ]);

        User::create([
            'name' => 'موظف مبيعات',
            'email' => 'seller@newpower.com',
            'password' => Hash::make('12345678'),
            'role' => 'SELLER',
        ]);

        User::create([
            'name' => 'عبيدة (مطبخ)',
            'email' => 'obeada@newpower.com',
            'password' => Hash::make('12345678'),
            'role' => 'CHEF',
        ]);

        // Create Categories
        $juiceCategory = Category::create(['name' => 'عصائر', 'label' => '🍹']);
        $dessertCategory = Category::create(['name' => 'حلويات', 'label' => '🍰']);

        // Create Inventory Items
        $items = [
            ['name' => 'برتقال طازج', 'quantity' => 150, 'unit' => 'كجم', 'min_threshold' => 20, 'cost_price' => 0.5, 'category' => 'FRUIT'],
            ['name' => 'مانجو هندي', 'quantity' => 80, 'unit' => 'كجم', 'min_threshold' => 15, 'cost_price' => 1.2, 'category' => 'FRUIT'],
            ['name' => 'حليب كامل الدسم', 'quantity' => 100, 'unit' => 'لتر', 'min_threshold' => 20, 'cost_price' => 0.8, 'category' => 'DAIRY'],
            ['name' => 'سكر ناعم', 'quantity' => 50, 'unit' => 'كجم', 'min_threshold' => 10, 'cost_price' => 0.4, 'category' => 'SWEETENER'],
            ['name' => 'فراولة بلدي', 'quantity' => 40, 'unit' => 'كجم', 'min_threshold' => 10, 'cost_price' => 1.5, 'category' => 'FRUIT'],
            ['name' => 'شوكولاتة بلجيكية', 'quantity' => 20, 'unit' => 'كجم', 'min_threshold' => 5, 'cost_price' => 4.5, 'category' => 'OTHER'],
            ['name' => 'أفوكادو فاخر', 'quantity' => 30, 'unit' => 'كجم', 'min_threshold' => 8, 'cost_price' => 2.5, 'category' => 'FRUIT'],
            ['name' => 'عسل جبلي', 'quantity' => 15, 'unit' => 'كجم', 'min_threshold' => 3, 'cost_price' => 6.0, 'category' => 'SWEETENER'],
            ['name' => 'كريمة خفق', 'quantity' => 25, 'unit' => 'لتر', 'min_threshold' => 5, 'cost_price' => 2.2, 'category' => 'DAIRY'],
            ['name' => 'خليط كيك جاهز', 'quantity' => 40, 'unit' => 'كجم', 'min_threshold' => 10, 'cost_price' => 1.1, 'category' => 'OTHER'],
        ];

        $invItems = [];
        foreach ($items as $item) {
            $invItems[] = InventoryItem::create($item);
        }

        // Create Products with Recipes
        $productsData = [
            [
                'name' => 'عصير برتقال طبيعي',
                'price' => 15000,
                'category_id' => $juiceCategory->id,
                'image' => 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
                'recipe' => [['item_index' => 0, 'amount' => 0.6]],
            ],
            [
                'name' => 'مانجو تانجو الملكي',
                'price' => 25000,
                'category_id' => $juiceCategory->id,
                'image' => 'https://images.unsplash.com/photo-1623065422902-30a2ad44924b?auto=format&fit=crop&w=600&q=80',
                'recipe' => [['item_index' => 1, 'amount' => 0.4], ['item_index' => 3, 'amount' => 0.05]],
            ],
            [
                'name' => 'لافا كيك الشوكولاتة',
                'price' => 35000,
                'category_id' => $dessertCategory->id,
                'image' => 'https://images.unsplash.com/photo-1624353365286-3f8d62adda51?auto=format&fit=crop&w=600&q=80',
                'recipe' => [['item_index' => 9, 'amount' => 0.2], ['item_index' => 5, 'amount' => 0.1], ['item_index' => 8, 'amount' => 0.05]],
            ],
            [
                'name' => 'موهيتو الفراولة المنعش',
                'price' => 18000,
                'category_id' => $juiceCategory->id,
                'image' => 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
                'recipe' => [['item_index' => 4, 'amount' => 0.2], ['item_index' => 3, 'amount' => 0.03]],
            ],
            [
                'name' => 'سلطة فواكه Prince Pro Lux القشطية',
                'price' => 32000,
                'category_id' => $dessertCategory->id,
                'image' => 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=600&q=80',
                'recipe' => [['item_index' => 0, 'amount' => 0.1], ['item_index' => 1, 'amount' => 0.1], ['item_index' => 4, 'amount' => 0.1], ['item_index' => 8, 'amount' => 0.08]],
            ],
            [
                'name' => 'كوكتيل أفوكادو بالعسل',
                'price' => 40000,
                'category_id' => $juiceCategory->id,
                'image' => 'https://images.unsplash.com/photo-1525385133335-842822916523?auto=format&fit=crop&w=600&q=80',
                'recipe' => [['item_index' => 6, 'amount' => 0.3], ['item_index' => 7, 'amount' => 0.05], ['item_index' => 2, 'amount' => 0.1]],
            ],
            [
                'name' => 'تشيز كيك التوت الأزرق',
                'price' => 38000,
                'category_id' => $dessertCategory->id,
                'image' => 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
                'recipe' => [['item_index' => 9, 'amount' => 0.15], ['item_index' => 8, 'amount' => 0.1], ['item_index' => 3, 'amount' => 0.05]],
            ],
            [
                'name' => 'ميلك شيك فانيلا براوني',
                'price' => 28000,
                'category_id' => $juiceCategory->id,
                'image' => 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
                'recipe' => [['item_index' => 2, 'amount' => 0.3], ['item_index' => 8, 'amount' => 0.05], ['item_index' => 5, 'amount' => 0.03]],
            ],
        ];

        foreach ($productsData as $productData) {
            $product = Product::create([
                'name' => $productData['name'],
                'price' => $productData['price'],
                'category_id' => $productData['category_id'],
                'image' => $productData['image'],
            ]);

            foreach ($productData['recipe'] as $recipeItem) {
                ProductRecipe::create([
                    'product_id' => $product->id,
                    'inventory_item_id' => $invItems[$recipeItem['item_index']]->id,
                    'amount' => $recipeItem['amount'],
                ]);
            }
        }

        // Create Delivery Companies
        DeliveryCompany::create(['name' => 'طلبات (Talabat)', 'commission_rate' => 15, 'is_active' => true]);
        DeliveryCompany::create(['name' => 'توترز (Toters)', 'commission_rate' => 18, 'is_active' => true]);
        DeliveryCompany::create(['name' => 'ديليفرو (Deliveroo)', 'commission_rate' => 20, 'is_active' => false]);

        // Create Initial Settings
        Setting::set('exchange_rate', 15200);
        Setting::set('treasury_usd', 1250);
        Setting::set('treasury_syp', 45000000);
    }
}
