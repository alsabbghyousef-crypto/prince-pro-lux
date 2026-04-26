<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * EnsureUserIsAccountant Middleware
 *
 * يسمح لـ ADMIN و ACCOUNTANT فقط بالوصول.
 * يُستخدم على routes التقارير والإحصائيات المالية.
 */
class EnsureUserIsAccountant
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, ['ADMIN', 'ACCOUNTANT'])) {
            return response()->json([
                'message' => 'غير مصرح. هذه البيانات متاحة للمحاسب والمدير فقط.',
                'code'    => 'ACCOUNTANT_ONLY',
            ], 403);
        }

        return $next($request);
    }
}
