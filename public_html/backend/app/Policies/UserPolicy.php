<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * ADMIN فقط يمكنه رؤية قائمة المستخدمين
     */
    public function viewAny(User $authUser): bool
    {
        return $authUser->role === 'ADMIN';
    }

    /**
     * ADMIN فقط يمكنه إضافة مستخدم جديد
     */
    public function create(User $authUser): bool
    {
        return $authUser->role === 'ADMIN';
    }

    /**
     * ADMIN فقط يمكنه تعديل مستخدم (لا يعدّل نفسه من هنا)
     */
    public function update(User $authUser, User $model): bool
    {
        return $authUser->role === 'ADMIN';
    }

    /**
     * ADMIN فقط يمكنه حذف مستخدم، ولا يحذف نفسه
     */
    public function delete(User $authUser, User $model): bool
    {
        return $authUser->role === 'ADMIN'
            && $authUser->id !== $model->id;
    }

    /**
     * ADMIN فقط يمكنه إعادة تعيين كلمة المرور
     */
    public function resetPassword(User $authUser, User $model): bool
    {
        return $authUser->role === 'ADMIN';
    }
}
