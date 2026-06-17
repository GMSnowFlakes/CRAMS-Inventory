<?php

namespace App\Modules\Updater\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use ZipArchive;

class UpdaterController extends Controller
{
    private string $repo;
    private string $current;

    public function __construct()
    {
        $this->repo    = config('version.repo');
        $this->current = config('version.current');
    }

    public function check(): JsonResponse
    {
        try {
            $response = Http::withHeaders(['User-Agent' => 'CRAMS-Updater/1.0'])
                ->timeout(10)
                ->get("https://api.github.com/repos/{$this->repo}/releases/latest");

            if ($response->failed()) {
                return response()->json(['error' => 'Could not reach update server.'], 503);
            }

            $release = $response->json();
            $latest  = ltrim($release['tag_name'] ?? '0.0.0', 'v');

            return response()->json([
                'current_version' => $this->current,
                'latest_version'  => $latest,
                'up_to_date'      => version_compare($this->current, $latest, '>='),
                'changelog'       => $release['body'] ?? 'No changelog provided.',
                'published_at'    => $release['published_at'] ?? null,
                'tag_name'        => $release['tag_name'] ?? null,
                'zipball_url'     => $release['zipball_url'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::error('Updater check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Update check failed.'], 503);
        }
    }

    public function update(Request $request): JsonResponse
    {
        $zipUrl = $request->input('zipball_url');
        if (!$zipUrl) {
            return response()->json(['error' => 'No download URL provided.'], 422);
        }

        $tmpZip  = storage_path('app/update_download.zip');
        $tmpDir  = storage_path('app/update_extracted');
        $appRoot = base_path();

        try {
            // 1. Download zip
            $response = Http::withHeaders(['User-Agent' => 'CRAMS-Updater/1.0'])
                ->timeout(120)
                ->get($zipUrl);

            if ($response->failed()) {
                return response()->json(['error' => 'Failed to download update package.'], 503);
            }

            file_put_contents($tmpZip, $response->body());

            // 2. Extract zip
            $zip = new ZipArchive();
            if ($zip->open($tmpZip) !== true) {
                return response()->json(['error' => 'Failed to open update package.'], 500);
            }

            if (is_dir($tmpDir)) {
                $this->deleteDirectory($tmpDir);
            }
            mkdir($tmpDir, 0755, true);
            $zip->extractTo($tmpDir);
            $zip->close();

            // GitHub zipballs extract into a subdirectory — find it
            $extracted = glob($tmpDir . '/*', GLOB_ONLYDIR);
            if (empty($extracted)) {
                return response()->json(['error' => 'Update package structure invalid.'], 500);
            }
            $sourceDir = $extracted[0];

            // 3. Copy files — skip .env, storage/, vendor/
            $skip = ['.env', 'storage', 'vendor', '.git', 'node_modules'];
            $this->copyDirectory($sourceDir, $appRoot, $skip);

            // 4. Run migrations
            Artisan::call('migrate', ['--force' => true]);

            // 5. Clear all caches
            Artisan::call('config:clear');
            Artisan::call('cache:clear');
            Artisan::call('view:clear');
            Artisan::call('route:clear');

            // 6. Cleanup temp files
            @unlink($tmpZip);
            $this->deleteDirectory($tmpDir);

            return response()->json([
                'success' => true,
                'message' => 'Update applied successfully. Please refresh the page.',
            ]);
        } catch (\Throwable $e) {
            Log::error('Updater apply failed', ['error' => $e->getMessage()]);
            @unlink($tmpZip);
            return response()->json(['error' => 'Update failed: ' . $e->getMessage()], 500);
        }
    }

    private function copyDirectory(string $src, string $dst, array $skip = []): void
    {
        $items = scandir($src);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            if (in_array($item, $skip)) continue;

            $srcPath = $src . DIRECTORY_SEPARATOR . $item;
            $dstPath = $dst . DIRECTORY_SEPARATOR . $item;

            if (is_dir($srcPath)) {
                if (!is_dir($dstPath)) mkdir($dstPath, 0755, true);
                $this->copyDirectory($srcPath, $dstPath, []);
            } else {
                copy($srcPath, $dstPath);
            }
        }
    }

    private function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) return;
        $items = scandir($dir);
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }
}
