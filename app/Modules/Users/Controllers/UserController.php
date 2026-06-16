<?php

namespace App\Modules\Users\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Users\Requests\StoreUserRequest;
use App\Modules\Users\Requests\UpdateUserRequest;
use App\Modules\Users\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private UserService $service) {}

    public function index(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $data = $this->service->paginate($companyId, $request->only(['search', 'role']));

        return response()->json($data);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->service->create($request->user()->company_id, $request->validated());

        return response()->json($user, 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizeCompany($request, $user->company_id);

        return response()->json($user);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorizeCompany($request, $user->company_id);
        $user = $this->service->update($user, $request->validated());

        return response()->json($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeCompany($request, $user->company_id);
        abort_if($user->id === $request->user()->id, 403, 'Cannot delete your own account.');
        $this->service->delete($user);

        return response()->json(null, 204);
    }

    private function authorizeCompany(Request $request, int $resourceCompanyId): void
    {
        abort_if($request->user()->company_id !== $resourceCompanyId, 403);
    }
}
