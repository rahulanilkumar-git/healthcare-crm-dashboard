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
use Illuminate\Validation\Rule;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

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

    public function stripeCheckout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => ['required', 'exists:invoices,id'],
        ]);

        $secret = env('STRIPE_SECRET');

        if (! $secret) {
            return response()->json([
                'message' => 'Stripe test payments are not configured. Add STRIPE_SECRET to backend/.env.',
            ], 422);
        }

        $invoice = Invoice::with('patient')->findOrFail($data['invoice_id']);

        if ($invoice->status === 'paid') {
            return response()->json(['message' => 'This invoice is already paid.'], 422);
        }

        try {
            $stripe = new StripeClient($secret);
            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');

            $session = $stripe->checkout->sessions->create([
                'mode' => 'payment',
                'payment_method_types' => ['card'],
                'customer_email' => $invoice->patient->email,
                'success_url' => $frontendUrl.'?stripe_status=success&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $frontendUrl.'?stripe_status=cancelled',
                'metadata' => [
                    'invoice_id' => (string) $invoice->id,
                    'patient_id' => (string) $invoice->patient_id,
                ],
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => [
                        'currency' => 'usd',
                        'unit_amount' => (int) round((float) $invoice->amount * 100),
                        'product_data' => [
                            'name' => $invoice->invoice_number,
                            'description' => $invoice->description,
                        ],
                    ],
                ]],
            ]);

            return response()->json([
                'checkout_url' => $session->url,
                'session_id' => $session->id,
            ]);
        } catch (ApiErrorException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }
    }

    public function stripeConfirm(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session_id' => ['required', 'string'],
        ]);

        $secret = env('STRIPE_SECRET');

        if (! $secret) {
            return response()->json([
                'message' => 'Stripe test payments are not configured. Add STRIPE_SECRET to backend/.env.',
            ], 422);
        }

        try {
            $stripe = new StripeClient($secret);
            $session = $stripe->checkout->sessions->retrieve($data['session_id']);
        } catch (ApiErrorException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if ($session->payment_status !== 'paid') {
            return response()->json([
                'message' => 'Stripe checkout has not been paid yet.',
                'payment_status' => $session->payment_status,
            ], 422);
        }

        $invoiceId = $session->metadata->invoice_id ?? null;
        $patientId = $session->metadata->patient_id ?? null;

        if (! $invoiceId || ! $patientId) {
            return response()->json(['message' => 'Stripe session is missing invoice metadata.'], 422);
        }

        $invoice = Invoice::findOrFail($invoiceId);

        $payment = Payment::firstOrCreate(
            ['stripe_payment_intent_id' => $session->payment_intent ?: $session->id],
            [
                'invoice_id' => $invoice->id,
                'patient_id' => $patientId,
                'amount' => $invoice->amount,
                'currency' => strtoupper($session->currency ?: 'USD'),
                'status' => 'paid',
                'paid_at' => Carbon::now(),
            ]
        );

        $invoice->update(['status' => 'paid']);

        return response()->json($payment->load(['patient', 'invoice']), 201);
    }

    public function createInvoice(Request $request, Patient $patient): JsonResponse
    {
        $data = $this->validatedInvoice($request);

        $invoice = Invoice::create([
            ...$data,
            'patient_id' => $patient->id,
            'invoice_number' => 'INV-'.Carbon::now()->format('Ymd').'-'.Str::upper(Str::random(6)),
            'status' => $data['status'] ?? 'sent',
        ]);

        return response()->json($invoice, 201);
    }

    public function updateInvoice(Request $request, Invoice $invoice): JsonResponse
    {
        $invoice->update($this->validatedInvoice($request, partial: true));

        return response()->json($invoice->fresh('payments'));
    }

    public function deleteInvoice(Invoice $invoice): JsonResponse
    {
        $invoice->delete();

        return response()->json(status: 204);
    }

    public function patientInvoices(Patient $patient): JsonResponse
    {
        return response()->json($patient->invoices()->with('payments')->latest()->get());
    }

    private function validatedInvoice(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'amount' => [$required, 'numeric', 'min:1'],
            'due_date' => [$required, 'date'],
            'description' => [$required, 'string', 'max:255'],
            'status' => [$partial ? 'sometimes' : 'sometimes', Rule::in(['draft', 'sent', 'paid', 'overdue'])],
        ]);
    }
}
