<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::with(['patient', 'doctor'])
            ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
            ->orderBy('scheduled_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json($appointments);
    }

    public function store(Request $request): JsonResponse
    {
        $appointment = Appointment::create($this->validated($request));

        return response()->json($appointment->load(['patient', 'doctor']), 201);
    }

    public function show(Appointment $appointment): JsonResponse
    {
        return response()->json($appointment->load(['patient', 'doctor']));
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $appointment->update($this->validated($request, partial: true));

        return response()->json($appointment->fresh()->load(['patient', 'doctor']));
    }

    public function destroy(Appointment $appointment): JsonResponse
    {
        $appointment->delete();

        return response()->json(status: 204);
    }

    public function search(Request $request): JsonResponse
    {
        $term = $request->query('q');

        $appointments = Appointment::with(['patient', 'doctor'])
            ->whereHas('patient', function ($query) use ($term) {
                $query->where('first_name', 'like', "%{$term}%")
                    ->orWhere('last_name', 'like', "%{$term}%");
            })
            ->limit(25)
            ->get();

        return response()->json($appointments);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'patient_id' => [$required, 'exists:patients,id'],
            'doctor_id' => [$required, 'exists:users,id'],
            'scheduled_at' => [$required, 'date'],
            'type' => [$required, Rule::in(['consultation', 'follow_up', 'lab_review', 'procedure'])],
            'status' => [$required, Rule::in(['scheduled', 'completed', 'cancelled', 'no_show'])],
            'reason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
