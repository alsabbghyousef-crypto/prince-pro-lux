<?php
$u = App\Models\User::where('email', 'basel@newpower.com')->first();
$u->password = Illuminate\Support\Facades\Hash::make('password');
$u->save();
echo 'Done';
