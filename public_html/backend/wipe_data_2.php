<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

DB::statement('SET FOREIGN_KEY_CHECKS=0;');

DB::table('order_items')->truncate();
DB::table('orders')->truncate();
DB::table('product_restocks')->truncate();
DB::table('products')->truncate();
DB::table('categories')->truncate();
DB::table('inventory_items')->truncate();
DB::table('customer_payments')->truncate();
DB::table('customers')->truncate();
DB::table('transactions')->truncate();
DB::table('exchange_rates_history')->truncate();

DB::statement('SET FOREIGN_KEY_CHECKS=1;');

echo "All store data has been deleted! (Users and settings kept intact)\n";
