<?php

namespace App\Modules\AuditLogs\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = AuditLog::where('company_id', $request->user()->company_id)
            ->with('user')
            ->orderByDesc('created_at');

        if ($request->filled('event')) {
            $q->where('event', $request->event);
        }
        if ($request->filled('model')) {
            $q->where('auditable_type', 'like', '%' . $request->model . '%');
        }
        if ($request->filled('user_id')) {
            $q->where('user_id', $request->user_id);
        }
        if ($request->filled('date_from')) {
            $q->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $q->whereDate('created_at', '<=', $request->date_to);
        }

        return response()->json($q->paginate(50));
    }
}
