<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->decimal('total_debt_usd', 15, 2)->default(0)->after('total_debt');
        });
        
        // Also add debt_currency to orders so we know how the debt was recorded
        Schema::table('orders', function (Blueprint $table) {
            $table->string('debt_currency', 10)->default('USD')->after('debt_amount');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('total_debt_usd');
        });
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('debt_currency');
        });
    }
};
