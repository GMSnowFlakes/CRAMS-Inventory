<?php

namespace App\Modules\Expenses\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Modules\Expenses\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private ExpenseService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->paginate(
                $request->user()->company_id,
                $request->only('category', 'from', 'to')
            )
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category'       => ['required', 'string', 'max:100'],
            'description'    => ['nullable', 'string', 'max:255'],
            'amount'         => ['required', 'numeric', 'min:0.01'],
            'expense_date'   => ['required', 'date'],
            'payment_method' => ['nullable', 'string', 'in:cash,card,bank_transfer,gcash,other'],
            'reference'      => ['nullable', 'string', 'max:100'],
            'notes'          => ['nullable', 'string', 'max:1000'],
            'branch_id'      => ['nullable', 'integer', 'exists:branches,id'],
        ]);

        $expense = $this->service->create(
            $request->user()->company_id,
            $request->user()->id,
            $data
        );

        return response()->json($expense->load('branch'), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $expense = Expense::where('company_id', $request->user()->company_id)
            ->with(['branch', 'createdBy'])
            ->findOrFail($id);
        return response()->json($expense);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $expense = Expense::where('company_id', $request->user()->company_id)->findOrFail($id);

        $data = $request->validate([
            'category'       => ['sometimes', 'string', 'max:100'],
            'description'    => ['nullable', 'string', 'max:255'],
            'amount'         => ['sometimes', 'numeric', 'min:0.01'],
            'expense_date'   => ['sometimes', 'date'],
            'payment_method' => ['nullable', 'string', 'in:cash,card,bank_transfer,gcash,other'],
            'reference'      => ['nullable', 'string', 'max:100'],
            'notes'          => ['nullable', 'string', 'max:1000'],
            'branch_id'      => ['nullable', 'integer', 'exists:branches,id'],
        ]);

        return response()->json($this->service->update($expense, $data));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $expense = Expense::where('company_id', $request->user()->company_id)->findOrFail($id);
        $this->service->delete($expense);
        return response()->json(null, 204);
    }

    public function categories(Request $request): JsonResponse
    {
        return response()->json($this->service->categories($request->user()->company_id));
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:2048']]);

        $path      = $request->file('file')->getRealPath();
        $handle    = fopen($path, 'r');
        $headers   = array_map(fn ($h) => strtolower(trim($h)), fgetcsv($handle));
        $companyId = $request->user()->company_id;
        $userId    = $request->user()->id;

        $imported = 0;
        $skipped  = 0;
        $errors   = [];
        $row      = 1;

        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            if (!array_filter($line)) { $skipped++; continue; }

            $raw = array_combine($headers, array_pad($line, count($headers), ''));

            $category = trim($raw['category'] ?? '');
            $amount   = (float) ($raw['amount'] ?? 0);
            $date     = trim($raw['date'] ?? $raw['expense_date'] ?? '');

            if (!$category || $amount <= 0) {
                $errors[] = "Row {$row}: missing category or invalid amount";
                $skipped++;
                continue;
            }

            $this->service->create($companyId, $userId, [
                'category'       => $category,
                'description'    => trim($raw['description'] ?? ''),
                'amount'         => $amount,
                'expense_date'   => $date ?: now()->toDateString(),
                'payment_method' => trim($raw['payment_method'] ?? '') ?: 'cash',
                'reference'      => trim($raw['reference'] ?? ''),
                'notes'          => trim($raw['notes'] ?? ''),
            ]);

            $imported++;
        }

        fclose($handle);

        return response()->json(compact('imported', 'skipped', 'errors'));
    }
}
