<?php

use App\Http\Controllers\DemoController;
use Illuminate\Support\Facades\Route;

Route::get('/demo-login/{token}', [DemoController::class, 'demoLogin']);

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
