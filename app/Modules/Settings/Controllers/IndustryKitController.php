<?php

namespace App\Modules\Settings\Controllers;

use App\Http\Controllers\Controller;
use App\Services\IndustryKitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IndustryKitController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(IndustryKitService::all());
    }

    public function config(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        return response()->json(IndustryKitService::forCompany($companyId));
    }

    public function apply(Request $request): JsonResponse
    {
        $request->validate(['kit' => ['required', 'string']]);

        $company = $request->user()->company;
        IndustryKitService::apply($company, $request->input('kit'));

        return response()->json([
            'message' => 'Industry kit applied.',
            'kit'     => $request->input('kit'),
            'config'  => IndustryKitService::forCompany($company->id),
        ]);
    }
}
