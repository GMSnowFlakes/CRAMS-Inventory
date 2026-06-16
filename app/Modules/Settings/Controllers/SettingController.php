<?php

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    /** Public — no auth required (login page needs branding) */
    public function branding(): JsonResponse
    {
        return response()->json([
            'company_name'     => Setting::get('company_name', 'CRAMS'),
            'logo_url'         => Setting::get('logo_url'),
            'primary_color'    => Setting::get('primary_color'),
            'currency_symbol'  => Setting::get('currency_symbol', '$'),
            'currency_code'    => Setting::get('currency_code', 'USD'),
            'default_tax_rate' => (float) Setting::get('default_tax_rate', 0),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'company_name'     => ['nullable', 'string', 'max:80'],
            'primary_color'    => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'currency_symbol'  => ['nullable', 'string', 'max:8'],
            'currency_code'    => ['nullable', 'string', 'size:3', 'uppercase'],
            'default_tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        if ($request->filled('company_name')) {
            Setting::set('company_name', $request->input('company_name'));
        }

        if ($request->filled('primary_color')) {
            Setting::set('primary_color', $request->input('primary_color'));
        }

        if ($request->filled('currency_symbol')) {
            Setting::set('currency_symbol', $request->input('currency_symbol'));
        }

        if ($request->filled('currency_code')) {
            Setting::set('currency_code', strtoupper($request->input('currency_code')));
        }

        if ($request->has('default_tax_rate')) {
            Setting::set('default_tax_rate', (float) $request->input('default_tax_rate'));
        }

        return response()->json(['message' => 'Settings updated.']);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:png,jpg,jpeg,svg', 'max:2048'],
        ]);

        // Remove old logo
        $old = Setting::get('logo_url');
        if ($old) {
            $oldPath = str_replace('/storage/', 'public/', ltrim($old, '/'));
            Storage::delete($oldPath);
        }

        $path = $request->file('logo')->store('public/branding');
        $url  = '/storage/' . str_replace('public/', '', $path);

        Setting::set('logo_url', $url);

        return response()->json(['logo_url' => $url]);
    }

    public function removeLogo(): JsonResponse
    {
        $old = Setting::get('logo_url');
        if ($old) {
            $oldPath = str_replace('/storage/', 'public/', ltrim($old, '/'));
            Storage::delete($oldPath);
            Setting::set('logo_url', null);
        }

        return response()->json(['message' => 'Logo removed.']);
    }
}
