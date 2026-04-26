<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table("products", function (Blueprint $table) {
            $table->decimal("cost_price", 15, 2)->default(0)->after("price");
            $table->string("currency", 10)->default("SYP")->after("cost_price");
        });

        Schema::create("product_restocks", function (Blueprint $table) {
            $table->id();
            $table->foreignId("product_id")->constrained()->cascadeOnDelete();
            $table->decimal("quantity_added", 10, 2);
            $table->decimal("cost_price", 15, 2)->default(0);
            $table->decimal("sale_price", 15, 2)->default(0);
            $table->string("currency", 10)->default("SYP");
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("product_restocks");
        Schema::table("products", function (Blueprint $table) {
            $table->dropColumn(["cost_price", "currency"]);
        });
    }
};

