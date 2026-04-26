<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->decimal('total', 15, 2);
            $table->decimal('total_syp', 15, 2)->default(0);
            $table->enum('currency', ['SYP', 'USD'])->default('SYP');
            $table->decimal('exchange_rate', 15, 2)->default(1);
            $table->enum('status', ['PENDING', 'COMPLETED', 'CANCELLED'])->default('COMPLETED');
            $table->enum('source', ['SHOP', 'MOTOBOX', 'DELIVERY_PARTNER'])->default('SHOP');
            $table->boolean('is_locked')->default(false);
            $table->foreignId('delivery_company_id')->nullable()->constrained('delivery_companies')->onDelete('set null');
            $table->boolean('is_settled')->default(false);
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
