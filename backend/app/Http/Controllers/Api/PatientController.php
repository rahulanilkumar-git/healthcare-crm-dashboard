<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $patients = Patient::query()
            ->when($request->query('search'), function ($query, string $search) {
                $query->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($patients);
    }

    public function store(Request $request): JsonResponse
    {
        $patient = Patient::create($this->validated($request));

        return response()->json($patient, 201);
    }

    public function show(Patient $patient): JsonResponse
    {
        return response()->json($patient->load(['medicalHistories', 'appointments.doctor', 'invoices']));
    }

    public function update(Request $request, Patient $patient): JsonResponse
    {
        $patient->update($this->validated($request, partial: true));

        return response()->json($patient->fresh());
    }

    public function destroy(Patient $patient): JsonResponse
    {
        $patient->delete();

        return response()->json(status: 204);
    }

    public function history(Patient $patient): JsonResponse
    {
        return response()->json($patient->medicalHistories()->latest('recorded_at')->get());
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'first_name' => [$required, 'string', 'max:120'],
            'last_name' => [$required, 'string', 'max:120'],
            'date_of_birth' => [$required, 'date'],
            'gender' => [$required, Rule::in(['female', 'male', 'other', 'prefer_not_to_say'])],
            'email' => [$required, 'email', 'max:255'],
            'phone' => [$required, 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:500'],
            'insurance_provider' => ['nullable', 'string', 'max:120'],
            'status' => [$required, Rule::in(['active', 'inactive'])],
        ]);
    }
}
