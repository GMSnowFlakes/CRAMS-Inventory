<?php

namespace App\Modules\Reports\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reports\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReportController extends Controller
{
    public function __construct(private ReportService $service) {}

    public function inventorySummary(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->inventorySummary($request->user()->company_id)
        );
    }

    public function movementSummary(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['required', 'date'],
            'to'   => ['required', 'date', 'after_or_equal:from'],
        ]);

        return response()->json(
            $this->service->movementSummary(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to')
            )
        );
    }

    public function topProducts(Request $request): JsonResponse
    {
        $request->validate([
            'from'  => ['required', 'date'],
            'to'    => ['required', 'date', 'after_or_equal:from'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        return response()->json(
            $this->service->topProducts(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to'),
                $request->integer('limit', 10)
            )
        );
    }

    public function stockValuation(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->stockValuation($request->user()->company_id)
        );
    }

    public function reorderSuggestions(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->reorderSuggestions($request->user()->company_id)
        );
    }

    public function deadStock(Request $request): JsonResponse
    {
        $request->validate([
            'days' => ['nullable', 'integer', 'min:7', 'max:365'],
        ]);

        return response()->json(
            $this->service->deadStock(
                $request->user()->company_id,
                $request->integer('days', 60)
            )
        );
    }

    public function cashFlowImpact(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->cashFlowImpact($request->user()->company_id)
        );
    }

    public function inventoryTimeline(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['required', 'date'],
            'to'   => ['required', 'date', 'after_or_equal:from'],
        ]);

        return response()->json(
            $this->service->inventoryTimeline(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to')
            )
        );
    }

    public function insights(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->insights($request->user()->company_id)
        );
    }

    public function healthScoreBreakdown(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->healthScoreBreakdown($request->user()->company_id)
        );
    }

    // ── Sales Reports ─────────────────────────────────────────────────────────

    private function dateRangeRules(): array
    {
        return [
            'from' => ['required', 'date'],
            'to'   => ['required', 'date', 'after_or_equal:from'],
        ];
    }

    public function salesSummary(Request $request): JsonResponse
    {
        $request->validate($this->dateRangeRules());
        return response()->json(
            $this->service->salesSummary(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to')
            )
        );
    }

    public function salesByPeriod(Request $request): JsonResponse
    {
        $request->validate($this->dateRangeRules());
        return response()->json(
            $this->service->salesByPeriod(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to')
            )
        );
    }

    public function topCustomers(Request $request): JsonResponse
    {
        $request->validate(array_merge($this->dateRangeRules(), [
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]));
        return response()->json(
            $this->service->topCustomers(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to'),
                $request->integer('limit', 10)
            )
        );
    }

    public function topSellingProducts(Request $request): JsonResponse
    {
        $request->validate(array_merge($this->dateRangeRules(), [
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]));
        return response()->json(
            $this->service->topSellingProducts(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to'),
                $request->integer('limit', 10)
            )
        );
    }

    public function profitLoss(Request $request): JsonResponse
    {
        $request->validate($this->dateRangeRules());
        return response()->json(
            $this->service->profitLoss(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to')
            )
        );
    }

    public function overdueSales(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->overdueSales($request->user()->company_id)
        );
    }

    public function expenseSummary(Request $request): JsonResponse
    {
        $request->validate($this->dateRangeRules());
        return response()->json(
            $this->service->expenseSummary(
                $request->user()->company_id,
                $request->input('from'),
                $request->input('to')
            )
        );
    }

    public function customerStatement(Request $request, int $customerId): JsonResponse
    {
        return response()->json(
            $this->service->customerStatement($request->user()->company_id, $customerId)
        );
    }

    public function exportInventory(Request $request): Response
    {
        $data = $this->service->exportInventory($request->user()->company_id);
        return $this->csvResponse('inventory', $data);
    }

    public function exportSales(Request $request): Response
    {
        $request->validate($this->dateRangeRules());
        $data = $this->service->exportSales(
            $request->user()->company_id,
            $request->input('from'),
            $request->input('to')
        );
        return $this->csvResponse('sales', $data);
    }

    public function exportExpenses(Request $request): Response
    {
        $request->validate($this->dateRangeRules());
        $data = $this->service->exportExpenses(
            $request->user()->company_id,
            $request->input('from'),
            $request->input('to')
        );
        return $this->csvResponse('expenses', $data);
    }

    public function exportMovements(Request $request): Response
    {
        $data = $this->service->exportMovements(
            $request->user()->company_id,
            $request->only(['from', 'to', 'type', 'branch_id'])
        );
        return $this->csvResponse('movements', $data);
    }

    public function supplierStatement(Request $request, int $supplierId): JsonResponse
    {
        return response()->json(
            $this->service->supplierStatement($request->user()->company_id, $supplierId)
        );
    }

    public function lowStockAlerts(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->lowStockAlerts($request->user()->company_id)
        );
    }

    private function csvResponse(string $name, array $rows): Response
    {
        if (empty($rows)) {
            $csv = "No data\n";
        } else {
            $headers = array_keys($rows[0]);
            $lines   = [implode(',', array_map(fn ($h) => '"' . $h . '"', $headers))];
            foreach ($rows as $row) {
                $lines[] = implode(',', array_map(fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"', $row));
            }
            $csv = implode("\n", $lines);
        }

        $filename = $name . '_' . now()->format('Y-m-d') . '.csv';
        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
