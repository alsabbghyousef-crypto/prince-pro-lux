<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create or Update Manager Ahmad
        $ahmad = User::where('email', 'ahmad@princeprolux.com')->first();
        if (!$ahmad) {
            // Check if old admin basel exists and migrate him
            $oldAdmin = User::where('email', 'basel@newpower.com')->first();
            if ($oldAdmin) {
                $oldAdmin->update([
                    'name' => 'أحمد (المدير)',
                    'email' => 'ahmad@princeprolux.com',
                    'password' => Hash::make('123456'),
                    'role' => 'ADMIN',
                ]);
            } else {
                User::create([
                    'name' => 'أحمد (المدير)',
                    'email' => 'ahmad@princeprolux.com',
                    'password' => Hash::make('123456'),
                    'role' => 'ADMIN',
                ]);
            }
        } else {
            $ahmad->update([
                'name' => 'أحمد (المدير)',
                'password' => Hash::make('123456'),
                'role' => 'ADMIN',
            ]);
        }

        // 2. Migrate any other newpower emails to princeprolux
        $usersToMigrate = [
            'mohamed@newpower.com' => ['name' => 'محمد (بائع)', 'email' => 'mohamed@princeprolux.com', 'role' => 'SELLER'],
            'seller@newpower.com'  => ['name' => 'موظف مبيعات', 'email' => 'seller@princeprolux.com', 'role' => 'SELLER'],
            'obeada@newpower.com'  => ['name' => 'عبيدة (مطبخ)', 'email' => 'obeada@princeprolux.com', 'role' => 'CHEF'],
            'admin@newpower.sy'    => ['name' => 'إدارة النظام', 'email' => 'admin@princeprolux.com', 'role' => 'ADMIN'],
        ];

        foreach ($usersToMigrate as $oldEmail => $newData) {
            $existing = User::where('email', $oldEmail)->first();
            if ($existing) {
                $existing->update([
                    'name' => $newData['name'],
                    'email' => $newData['email'],
                    'password' => Hash::make('123456'),
                    'role' => $newData['role'],
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    }
};
