export const dashboardFallback = {
  patients: 1248,
  active_patients: 1172,
  appointments_today: 26,
  monthly_revenue: 84250,
  upcoming_appointments: [
    { id: 1, scheduled_at: '2026-05-05T09:30:00', type: 'consultation', status: 'scheduled', patient: { first_name: 'Avery', last_name: 'Johnson' }, doctor: { name: 'Dr. Maya Chen' } },
    { id: 2, scheduled_at: '2026-05-05T10:15:00', type: 'follow_up', status: 'scheduled', patient: { first_name: 'Noah', last_name: 'Patel' }, doctor: { name: 'Dr. Maya Chen' } },
    { id: 3, scheduled_at: '2026-05-05T11:00:00', type: 'lab_review', status: 'scheduled', patient: { first_name: 'Sophia', last_name: 'Garcia' }, doctor: { name: 'Dr. Maya Chen' } },
  ],
};

export const patientsFallback = [
  { id: 1, first_name: 'Avery', last_name: 'Johnson', email: 'avery@example.com', phone: '555-0101', insurance_provider: 'BlueCross', status: 'active' },
  { id: 2, first_name: 'Noah', last_name: 'Patel', email: 'noah@example.com', phone: '555-0102', insurance_provider: 'Aetna', status: 'active' },
  { id: 3, first_name: 'Sophia', last_name: 'Garcia', email: 'sophia@example.com', phone: '555-0103', insurance_provider: 'UnitedHealth', status: 'active' },
  { id: 4, first_name: 'Ethan', last_name: 'Williams', email: 'ethan@example.com', phone: '555-0104', insurance_provider: 'Cigna', status: 'inactive' },
];
