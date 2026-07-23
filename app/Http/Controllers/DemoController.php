<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoController extends Controller
{
    private function hyperbeamKey(): string
    {
        $key = config('services.hyperbeam.key', env('HYPERBEAM_API_KEY'));
        if (!$key) {
            abort(500, 'HYPERBEAM_API_KEY is not set.');
        }
        return $key;
    }

    public function start(Request $request): JsonResponse
    {
        $appUrl = config('app.url');

        $demoToken = Str::uuid()->toString();
        cache()->put("demo-login:{$demoToken}", true, now()->addMinutes(35));

        $startUrl = "{$appUrl}/demo-login/{$demoToken}";

        $resp = Http::withToken($this->hyperbeamKey())
            ->timeout(30)
            ->post('https://engine.hyperbeam.com/v0/vm', [
                'start_url' => $startUrl,
                'kiosk'     => true,
                'width'     => 1280,
                'height'    => 800,
                'fps'       => 30,
                'quality'   => ['mode' => 'smooth'],
                'timeout'   => [
                    'absolute' => 1800,
                    'inactive' => 600,
                    'offline'  => 300,
                    'warning'  => 60,
                ],
                'adblock'   => true,
                'dark'      => true,
            ]);

        if (!$resp->successful()) {
            return response()->json([
                'message' => 'Failed to start demo session.',
                'error'    => $resp->body(),
            ], 502);
        }

        $data = $resp->json();

        return response()->json([
            'session_id' => $data['session_id'],
            'embed_url'  => $data['embed_url'],
            'expires_in'  => 1800,
        ]);
    }

    public function demoLogin(string $token)
    {
        if (!cache()->has("demo-login:{$token}")) {
            abort(403, 'Demo link expired or invalid.');
        }
        cache()->forget("demo-login:{$token}");

        $demoUser = User::where('email', 'demo@inventoryos.app')->first();
        if (!$demoUser) {
            abort(500, 'Demo user not configured. Run: php artisan db:seed --class=DemoSeeder');
        }

        $apiToken = $demoUser->createToken('demo', ['*'], now()->addMinutes(30))->plainTextToken;

        return view('demo-autologin', [
            'token'   => $apiToken,
            'redirect'=> '/dashboard',
        ]);
    }

    public function end(Request $request): JsonResponse
    {
        $request->validate(['session_id' => 'required|string']);
        $sessionId = $request->input('session_id');

        Http::withToken($this->hyperbeamKey())
            ->timeout(10)
            ->delete("https://engine.hyperbeam.com/v0/vm/{$sessionId}");

        return response()->json(['message' => 'Session ended.']);
    }
}
