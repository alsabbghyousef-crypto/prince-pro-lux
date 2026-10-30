<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'name' => ['بيانات الدخول غير صحيحة'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'تم تسجيل الخروج بنجاح']);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        
        $rolesData = null;
        $raw = \App\Models\Setting::get('roles_permissions');
        if ($raw) {
            $rolesData = json_decode($raw, true);
        }
        $roles = $rolesData['roles'] ?? \App\Http\Controllers\Api\SettingsController::getDefaultRoles();
        
        $userRole = $user->role;
        $roleMatch = null;
        foreach ($roles as $r) {
            if ($r['id'] === $userRole || (isset($r['name']) && $r['name'] === $userRole)) {
                $roleMatch = $r;
                break;
            }
        }
        
        if ($userRole === 'ADMIN' || ($roleMatch && $roleMatch['id'] === 'ADMIN')) {
            $allowedPages = ['dashboard', 'sales', 'orders', 'items', 'datasheets', 'customers', 'expenses', 'exchange-rates', 'users', 'settings'];
            $actions = [
                'pos_edit_price' => true,
                'pos_apply_discount' => true,
                'inventory_edit' => true,
                'orders_delete' => true,
                'view_profits' => true,
            ];
        } else if ($roleMatch) {
            $allowedPages = $roleMatch['allowed_pages'] ?? [];
            $actions = $roleMatch['actions'] ?? [];
        } else {
            $allowedPages = ['sales', 'orders'];
            $actions = [
                'pos_edit_price' => false,
                'pos_apply_discount' => false,
                'inventory_edit' => false,
                'orders_delete' => false,
                'view_profits' => false,
            ];
        }

        $userData = $user->toArray();
        $userData['allowed_pages'] = $allowedPages;
        $userData['actions'] = $actions;

        return response()->json($userData);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'name' => 'required|string|unique:users,name,' . $user->id,
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
        ]);

        $user->name = $request->name;
        if ($request->email) {
            $user->email = $request->email;
        }
        
        if ($request->password) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'message' => 'تم تحديث الملف الشخصي بنجاح',
            'user' => $user
        ]);
    }

    public function index()
    {
        $users = User::all();
        return response()->json($users->map(function ($user) {
            return [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'salary' => $user->salary,
                'join_date' => $user->join_date ? $user->join_date->toDateString() : null,
                'shift_start' => $user->shift_start,
                'shift_end' => $user->shift_end,
                'face_id' => $user->face_id ? true : false,
            ];
        }));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'nullable|string|min:4',
            'role' => 'nullable|string|max:100',
        ]);

        $email = $request->email;
        if (!$email) {
            $email = 'user_' . time() . '_' . rand(100, 999) . '@princeprolux.local';
        }

        $password = $request->password ?: '123456';

        $user = User::create([
            'name' => $request->name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => $request->role ?: 'SELLER',
            'salary' => $request->salary ?? 0,
            'join_date' => $request->join_date ?: now()->toDateString(),
            'shift_start' => $request->shift_start,
            'shift_end' => $request->shift_end,
        ]);

        return response()->json([
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'salary' => $user->salary,
            'join_date' => $user->join_date ? $user->join_date->toDateString() : null,
            'shift_start' => $user->shift_start,
            'shift_end' => $user->shift_end,
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'role' => 'nullable|string|max:100',
        ]);

        if ($request->has('name')) {
            $user->name = $request->name;
        }
        if ($request->has('email') && $request->email) {
            $user->email = $request->email;
        }
        if ($request->has('role')) {
            $user->role = $request->role;
        }
        if ($request->has('password') && !empty($request->password)) {
            $user->password = Hash::make($request->password);
        }
        if ($request->has('salary')) {
            $user->salary = $request->salary;
        }
        if ($request->has('join_date')) {
            $user->join_date = $request->join_date;
        }
        if ($request->has('shift_start')) {
            $user->shift_start = $request->shift_start;
        }
        if ($request->has('shift_end')) {
            $user->shift_end = $request->shift_end;
        }

        $user->save();

        return response()->json([
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'salary' => $user->salary,
            'join_date' => $user->join_date ? $user->join_date->toDateString() : null,
            'shift_start' => $user->shift_start,
            'shift_end' => $user->shift_end,
        ]);
    }

    public function updatePassword(Request $request, User $user)
    {
        $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json(['message' => 'تم تغيير كلمة المرور بنجاح']);
    }

    public function destroy(User $user)
    {
        // منع حذف المستخدم الحالي
        if (auth()->id() === $user->id) {
            return response()->json(['error' => 'لا يمكنك حذف حسابك'], 400);
        }

        $user->delete();

        return response()->json(['message' => 'تم حذف المستخدم بنجاح']);
    }
}
