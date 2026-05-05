<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        return response()->json([
            'patients' => Patient::count(),
            'active_patients' => Patient::where('status', 'active')->count(),
            'appointments_today' => Appointment::whereDate('scheduled_at', Carbon::today())->count(),
            'monthly_revenue' => Payment::where('status', 'paid')
                ->whereMonth('paid_at', Carbon::now()->month)
                ->sum('amount'),
            'upcoming_appointments' => Appointment::with(['patient', 'doctor'])
                ->where('scheduled_at', '>=', Carbon::now())
                ->orderBy('scheduled_at')
                ->limit(6)
                ->get(),
        ]);
    }

    public function patients(): JsonResponse
    {
        return response()->json(Patient::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get());
    }

    public function revenue(): JsonResponse
    {
        $monthExpression = 'DATE_FORMAT(paid_at, "%Y-%m")';

        return response()->json(Payment::query()
            ->selectRaw($monthExpression.' as month, SUM(amount) as total')
            ->where('status', 'paid')
            ->groupBy(DB::raw($monthExpression))
            ->orderBy('month')
            ->get());
    }

    public function appointments(): JsonResponse
    {
        return response()->json(Appointment::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get());
    }
}
