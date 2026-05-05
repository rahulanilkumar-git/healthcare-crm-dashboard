<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\MedicalHistory;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['name' => 'admin', 'label' => 'Administrator'],
            ['name' => 'doctor', 'label' => 'Doctor'],
            ['name' => 'patient', 'label' => 'Patient'],
        ] as $role) {
            DB::table('roles')->updateOrInsert(
                ['name' => $role['name']],
                ['label' => $role['label'], 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()]
            );
        }

        foreach ([
            ['name' => 'manage_patients', 'label' => 'Manage patients'],
            ['name' => 'manage_appointments', 'label' => 'Manage appointments'],
            ['name' => 'manage_billing', 'label' => 'Manage billing'],
            ['name' => 'view_analytics', 'label' => 'View analytics'],
        ] as $permission) {
            DB::table('permissions')->updateOrInsert(
                ['name' => $permission['name']],
                ['label' => $permission['label'], 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()]
            );
        }

        $roleIds = DB::table('roles')->pluck('id', 'name');
        $permissionIds = DB::table('permissions')->pluck('id', 'name');

        foreach ($permissionIds as $permissionId) {
            DB::table('permission_role')->updateOrInsert(['permission_id' => $permissionId, 'role_id' => $roleIds['admin']]);
        }

        foreach (['manage_patients', 'manage_appointments', 'view_analytics'] as $permission) {
            DB::table('permission_role')->updateOrInsert(['permission_id' => $permissionIds[$permission], 'role_id' => $roleIds['doctor']]);
        }

        User::updateOrCreate(
            ['email' => 'admin@healthcrm.test'],
            ['name' => 'Rahul Admin', 'password' => Hash::make('password123'), 'role' => 'admin']
        );

        $doctor = User::updateOrCreate(
            ['email' => 'doctor@healthcrm.test'],
            ['name' => 'Dr. Maya Chen', 'password' => Hash::make('password123'), 'role' => 'doctor']
        );

        $patients = collect([
            ['Avery', 'Johnson', '1985-03-12', 'female', 'avery@example.com', '555-0101', 'BlueCross'],
            ['Noah', 'Patel', '1978-09-04', 'male', 'noah@example.com', '555-0102', 'Aetna'],
            ['Sophia', 'Garcia', '1992-11-22', 'female', 'sophia@example.com', '555-0103', 'UnitedHealth'],
            ['Ethan', 'Williams', '1969-06-18', 'male', 'ethan@example.com', '555-0104', 'Cigna'],
        ])->map(fn ($row) => Patient::updateOrCreate(
            ['email' => $row[4]],
            [
                'first_name' => $row[0],
                'last_name' => $row[1],
                'date_of_birth' => $row[2],
                'gender' => $row[3],
                'phone' => $row[5],
                'address' => '100 Care Ave',
                'insurance_provider' => $row[6],
                'status' => 'active',
            ]
        ));

        foreach ($patients as $index => $patient) {
            $condition = ['Hypertension', 'Diabetes follow-up', 'Annual wellness', 'Post-op review'][$index];

            MedicalHistory::updateOrCreate([
                'patient_id' => $patient->id,
                'condition' => $condition,
            ], [
                'medications' => $index === 0 ? 'Lisinopril' : null,
                'allergies' => $index === 2 ? 'Penicillin' : null,
                'notes' => 'Seeded clinical note for dashboard demos.',
                'recorded_at' => Carbon::now()->subDays(30 - $index),
            ]);

            Appointment::updateOrCreate([
                'patient_id' => $patient->id,
                'type' => ['consultation', 'follow_up', 'lab_review', 'procedure'][$index],
            ], [
                'doctor_id' => $doctor->id,
                'scheduled_at' => Carbon::now()->addDays($index)->setTime(9 + $index, 30),
                'status' => $index === 0 ? 'completed' : 'scheduled',
                'reason' => 'Routine care visit',
            ]);

            $invoiceNumber = 'INV-2026-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT);

            $invoice = Invoice::updateOrCreate([
                'invoice_number' => $invoiceNumber,
            ], [
                'patient_id' => $patient->id,
                'amount' => 125 + ($index * 75),
                'due_date' => Carbon::now()->addDays(14),
                'status' => $index < 2 ? 'paid' : 'sent',
                'description' => 'Clinical services',
            ]);

            if ($index < 2) {
                Payment::updateOrCreate([
                    'stripe_payment_intent_id' => 'demo_seed_'.$index,
                ], [
                    'invoice_id' => $invoice->id,
                    'patient_id' => $patient->id,
                    'amount' => $invoice->amount,
                    'currency' => 'USD',
                    'status' => 'paid',
                    'paid_at' => Carbon::now()->subDays($index + 1),
                ]);
            }
        }
    }
}
