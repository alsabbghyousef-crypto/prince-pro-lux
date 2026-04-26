<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * EnsureUserIsAdmin Middleware
 *
 * يتحقق أن المستخدم المُصادق عليه يحمل دور ADMIN.
 * يُستخدم على routes إدارة المستخدمين والإعدادات الحساسة.
 */
class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user || $user->role !== 'ADMIN') {
            return response()->json([
                'message' => 'غير مصرح. هذه العملية مخصصة للمدير فقط.',
                'code'    => 'ADMIN_ONLY',
            ], 403);
        }

        return $next($request);
    }
}
