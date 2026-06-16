<?php

namespace App\Modules\Products\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Modules\Products\Requests\StoreProductRequest;
use App\Modules\Products\Requests\UpdateProductRequest;
use App\Modules\Products\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private ProductService $service) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $data = $this->service->paginate($companyId, $request->only(['search', 'category', 'is_active']));

        return response()->json($data);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $product = $this->service->create($companyId, $request->validated());

        return response()->json($product, 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        $this->authorizeCompany($request, $product->company_id);

        return response()->json($product->load(['supplier', 'stockLevel']));
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $this->authorizeCompany($request, $product->company_id);
        $product = $this->service->update($product, $request->validated());

        return response()->json($product);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorizeCompany($request, $product->company_id);
        $this->service->delete($product);

        return response()->json(null, 204);
    }

    public function categories(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        return response()->json($this->service->categories($companyId));
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:2048']]);

        $companyId = $request->user()->company_id;
        $path      = $request->file('file')->getRealPath();
        $handle    = fopen($path, 'r');
        $header    = array_map('trim', fgetcsv($handle));

        $imported = 0;
        $skipped  = 0;
        $errors   = [];
        $row      = 1;

        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            if (count($line) !== count($header)) {
                $errors[] = "Row {$row}: column count mismatch";
                $skipped++;
                continue;
            }

            $data = array_combine($header, array_map('trim', $line));
            $name = $data['Name'] ?? $data['name'] ?? '';

            if ($name === '') {
                $errors[] = "Row {$row}: Name is required";
                $skipped++;
                continue;
            }

            try {
                $this->service->create($companyId, [
                    'name'          => $name,
                    'sku'           => ($data['SKU'] ?? $data['sku'] ?? '') ?: null,
                    'category'      => ($data['Category'] ?? $data['category'] ?? '') ?: null,
                    'unit'          => ($data['Unit'] ?? $data['unit'] ?? '') ?: null,
                    'cost_price'    => is_numeric($v = $data['Cost Price'] ?? $data['cost_price'] ?? '') ? $v : 0,
                    'selling_price' => is_numeric($v = $data['Selling Price'] ?? $data['selling_price'] ?? '') ? $v : 0,
                    'reorder_level' => is_numeric($v = $data['Reorder Level'] ?? $data['reorder_level'] ?? '') ? (int) $v : 0,
                ]);
                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "Row {$row}: " . $e->getMessage();
                $skipped++;
            }
        }

        fclose($handle);

        return response()->json(compact('imported', 'skipped', 'errors'));
    }

    private function authorizeCompany(Request $request, int $resourceCompanyId): void
    {
        abort_if($request->user()->company_id !== $resourceCompanyId, 403);
    }
}
