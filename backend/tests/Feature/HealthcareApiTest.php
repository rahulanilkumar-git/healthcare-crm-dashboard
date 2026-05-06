<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Patient;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            ->postJson('/api/payments', [
                'invoice_id' => $invoiceId,
                'patient_id' => $patient->id,
                'amount' => 95.50,
                'currency' => 'USD',
            ])
            ->assertCreated()
            ->assertJsonPath('status', 'paid');

        $this->assertSame('paid', Invoice::query()->findOrFail($invoiceId)->status);
    }
}
