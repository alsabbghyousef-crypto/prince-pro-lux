<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, drop the attendances foreign key and table if it exists
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('employees');

        Schema::table('users', function (Blueprint $table) {
            $table->decimal('salary', 15, 2)->default(0)->after('role');
            $table->date('join_date')->nullable()->after('salary');
            $table->time('shift_start')->nullable()->after('join_date');
            $table->time('shift_end')->nullable()->after('shift_start');
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
            // Optional: convert enum to string to allow free-form roles if needed
            // $table->string('role')->nullable()->change(); 
            // In laravel, modifying enum is tricky via doctrine/dbal, so we might just leave it or use a separate column
        });

        // Recreate attendances table to point to users
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('date');
            $table->dateTime('check_in')->nullable();
            $table->dateTime('check_out')->nullable();
            $table->string('status')->default('PRESENT');
            $table->integer('lateness_minutes')->default(0);
            $table->integer('early_departure_minutes')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['salary', 'join_date', 'shift_start', 'shift_end']);
            $table->string('email')->nullable(false)->change();
            $table->string('password')->nullable(false)->change();
        });
    }
};
