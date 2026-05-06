<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'created_at'])
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $user = User::create([
            ...$data,
            'password' => Hash::make($data['password']),
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $this->validated($request, $user);

        if (array_key_exists('password', $data)) {
            if ($data['password'] === null || $data['password'] === '') {
                unset($data['password']);
            } else {
                $data['password'] = Hash::make($data['password']);
            }
        }

        $user->update($data);

        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->is($user)) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(status: 204);
    }

    private function validated(Request $request, ?User $user = null): array
    {
        $required = $user ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:255'],
            'email' => [$required, 'email', 'max:255', Rule::unique('users')->ignore($user)],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => [$required, Rule::in(['admin', 'doctor', 'patient'])],
        ]);
    }
}
