<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('containers', function (Blueprint $table) {
            $table->id();
            $table->string('container_number')->index();
            $table->string('title')->nullable();
            $table->string('status', 50)->default('ARRIVED'); // SHIPPING, ARRIVED, UNLOADING, COMPLETED
            $table->string('supplier')->nullable();
            $table->string('origin')->nullable();
            $table->date('shipping_date')->nullable();
            $table->date('arrival_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('container_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('container_id')->constrained('containers')->cascadeOnDelete();
            $table->string('title');
            $table->string('original_name');
            $table->string('file_path');
            $table->string('file_type', 50)->default('other'); // pdf, excel, word, image, archive, text, other
            $table->string('file_extension', 20)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->text('description')->nullable();
            $table->unsignedInteger('downloads_count')->default(0);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('container_files');
        Schema::dropIfExists('containers');
    }
};
