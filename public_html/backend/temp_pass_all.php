<?php
$users = App\Models\User::all();
foreach ($users as $u) {
    $u->password = Illuminate\Support\Facades\Hash::make('12345678');
    $u->save();
}
echo 'Restored all passwords to 12345678';
