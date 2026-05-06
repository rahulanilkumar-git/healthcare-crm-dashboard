<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => ['required', 'exists:invoices,id'],
            'patient_id' => ['required', 'exists:patients,id'],
            'amount' => ['required', 'numeric', 'min:1'],
            'currency' => ['sometimes', 'string', 'size:3'],
        ]);

        $payment = Payment::create([
            ...$data,
            'currency' => strtoupper($data['currency'] ?? 'USD'),
            'stripe_payment_intent_id' => 'demo_'.Str::uuid(),
            'status' => 'paid',
            'paid_at' => Carbon::now(),
        ]);

        Invoice::whereKey($data['invoice_id'])->update(['status' => 'paid']);

        return response()->json($payment->load(['patient', 'invoice']), 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return response()->json($payment->load(['patient', 'invoice']));
    }

    public function receipt(Payment $payment): JsonResponse
    {
        return response()->json([
            'receipt_number' => 'RCT-'.$payment->id,
            'payment' => $payment->load(['patient', 'invoice']),
            'issued_at' => Carbon::now()->toIso8601String(),
        ]);
    }

    public function createInvoice(Request $request, Patient $patient): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'due_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'status' => ['sometimes', 'in:draft,sent,paid,overdue'],
        ]);

        $invoice = Invoice::create([
            ...$data,
            'patient_id' => $patient->id,
            'invoice_number' => 'INV-'.Carbon::now()->format('Ymd').'-'.Str::upper(Str::random(6)),
            'status' => $data['status'] ?? 'sent',
        ]);

        return response()->json($invoice, 201);
    }

    public function patientInvoices(Patient $patient): JsonResponse
    {
        return response()->json($patient->invoices()->with('payments')->latest()->get());
    }
}
