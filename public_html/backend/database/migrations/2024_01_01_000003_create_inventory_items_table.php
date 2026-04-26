<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('quantity', 10, 2)->default(0);
            $table->string('unit');
            $table->decimal('min_threshold', 10, 2)->default(0);
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('average_cost_syp', 15, 2)->default(0);
            $table->decimal('total_cost_syp', 15, 2)->default(0);
            $table->decimal('last_cost_syp', 15, 2)->default(0);
            $table->unsignedBigInteger('last_purchase_id')->nullable();
            $table->enum('category', ['FRUIT', 'DAIRY', 'SWEETENER', 'OTHER'])->default('OTHER');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
