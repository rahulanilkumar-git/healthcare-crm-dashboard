<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class HealthcareApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_manage_core_healthcare_workflows(): void
    {
        $this->seed(DatabaseSeeder::class);

        $token = $this->postJson('/api/auth/login', [
            'email' => 'admin@healthcrm.test',
            'password' => 'password123',
        ])->assertOk()->json('token');

        $headers = ['Authorization' => "Bearer {$token}"];
        $patient = Patient::query()->firstOrFail();

        $this->withHeaders($headers)
            ->getJson('/api/patients?per_page=3')
            ->assertOk()
            ->assertJsonStructure(['data']);

        $this->withHeaders($headers)
            ->postJson("/api/patients/{$patient->id}/history", [
                'condition' => 'API workflow check',
                'notes' => 'History was created by a feature test.',
            ])
            ->assertCreated()
            ->assertJsonPath('condition', 'API workflow check');

        $invoiceId = $this->withHeaders($headers)
            ->postJson("/api/patients/{$patient->id}/invoices", [
                'amount' => 95.50,
                'due_date' => now()->addWeek()->toDateString(),
                'description' => 'Feature test invoice',
                'status' => 'sent',
            ])
            ->assertCreated()
            ->assertJsonPath('status', 'sent')
            ->json('id');

        $this->withHeaders($headers)
            ->postJson('/api/payments/stripe-checkout', ['invoice_id' => $invoiceId])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Stripe test payments are not configured. Add STRIPE_SECRET to backend/.env.');

        $this->withHeaders($headers)
            ->postJson('/api/payments/stripe-confirm', ['session_id' => 'cs_test_missing_config'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Stripe test payments are not configured. Add STRIPE_SECRET to backend/.env.');

        $paymentId = $this->withHeaders($headers)
            ->postJson('/api/payments', [
                'invoice_id' => $invoiceId,
                'patient_id' => $patient->id,
                'amount' => 95.50,
                'currency' => 'USD',
            ])
            ->assertCreated()
            ->assertJsonPath('status', 'paid')
            ->json('id');

        $this->withHeaders($headers)
            ->postJson("/api/payments/{$paymentId}/receipt")
            ->assertOk()
            ->assertJsonStructure(['receipt_number', 'payment', 'issued_at']);

        $this->withHeaders($headers)
            ->getJson('/api/analytics/revenue')
            ->assertOk()
            ->assertJsonFragment(['month' => now()->format('Y-m')]);

        $this->withHeaders($headers)
            ->getJson('/api/analytics/appointments')
            ->assertOk();

        $this->withHeaders($headers)
            ->putJson("/api/invoices/{$invoiceId}", [
                'amount' => 110,
                'due_date' => now()->addWeeks(2)->toDateString(),
                'description' => 'Updated feature test invoice',
                'status' => 'paid',
            ])
            ->assertOk()
            ->assertJsonPath('description', 'Updated feature test invoice');

        $createdUserId = $this->withHeaders($headers)
            ->postJson('/api/users', [
                'name' => 'Billing Admin',
                'email' => 'billing.admin@healthcrm.test',
                'password' => 'password123',
                'role' => 'admin',
            ])
            ->assertCreated()
            ->assertJsonPath('role', 'admin')
            ->json('id');

        $this->withHeaders($headers)
            ->putJson("/api/users/{$createdUserId}", [
                'name' => 'Billing Manager',
                'email' => 'billing.manager@healthcrm.test',
                'role' => 'admin',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Billing Manager');

        $this->withHeaders($headers)
            ->deleteJson("/api/users/{$createdUserId}")
            ->assertNoContent();

        $deletedInvoiceId = $this->withHeaders($headers)
            ->postJson("/api/patients/{$patient->id}/invoices", [
                'amount' => 45,
                'due_date' => now()->addWeek()->toDateString(),
                'description' => 'Delete me',
                'status' => 'draft',
            ])
            ->assertCreated()
            ->json('id');

        $this->withHeaders($headers)
            ->deleteJson("/api/invoices/{$deletedInvoiceId}")
            ->assertNoContent();

        $doctorToken = $this->postJson('/api/auth/login', [
            'email' => 'doctor@healthcrm.test',
            'password' => 'password123',
        ])->assertOk()->json('token');

        $doctorHeaders = ['Authorization' => "Bearer {$doctorToken}"];

        $this->withHeaders($doctorHeaders)
            ->getJson('/api/users')
            ->assertForbidden();

        $this->withHeaders($doctorHeaders)
            ->postJson('/api/payments', [
                'invoice_id' => $invoiceId,
                'patient_id' => $patient->id,
                'amount' => 95.50,
                'currency' => 'USD',
            ])
            ->assertForbidden();

        $this->assertSame('paid', Invoice::query()->findOrFail($invoiceId)->status);
    }

    public function test_patient_role_is_blocked_from_clinical_and_admin_routes(): void
    {
        $this->seed(DatabaseSeeder::class);

        $user = User::create([
            'name' => 'Patient Portal User',
            'email' => 'portal.patient@healthcrm.test',
            'password' => Hash::make('password123'),
            'role' => 'patient',
        ]);

        $token = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk()->json('token');

        $headers = ['Authorization' => "Bearer {$token}"];

        $this->withHeaders($headers)->getJson('/api/patients')->assertForbidden();
        $this->withHeaders($headers)->getJson('/api/users')->assertForbidden();
        $this->withHeaders($headers)->getJson('/api/analytics/dashboard')->assertForbidden();
    }
}
