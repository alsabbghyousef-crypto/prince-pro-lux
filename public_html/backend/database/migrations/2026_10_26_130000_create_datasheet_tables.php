<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('datasheet_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('parent_id')->nullable()->constrained('datasheet_categories')->nullOnDelete();
            $table->string('icon')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('datasheets', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('original_name');
            $table->string('file_path');
            $table->string('file_type')->nullable(); // 'pdf', 'excel', 'word', 'image', 'archive', 'other'
            $table->string('file_extension', 20)->nullable();
            $table->unsignedBigInteger('file_size')->default(0); // bytes
            $table->foreignId('category_id')->nullable()->constrained('datasheet_categories')->nullOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained('datasheet_categories')->nullOnDelete();
            $table->text('description')->nullable();
            $table->string('tags')->nullable();
            $table->unsignedInteger('downloads_count')->default(0);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('datasheets');
        Schema::dropIfExists('datasheet_categories');
    }
};
