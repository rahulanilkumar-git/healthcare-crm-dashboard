import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  HeartPulse,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { dashboardFallback, patientsFallback } from './features/demoData';
import {
  createAppointment,
  createPatient,
  getAppointments,
  getDashboard,
  getPatients,
  login,
} from './services/api';
import './styles.css';

const navItems = [
  ['overview', 'Overview', HeartPulse],
  ['patients', 'Patients', Users],
  ['appointments', 'Appointments', CalendarDays],
  ['billing', 'Billing', CreditCard],
  ['records', 'Records', ClipboardList],
  ['access', 'Access', ShieldCheck],
];

const emptyPatient = {
  first_name: '',
  last_name: '',
  date_of_birth: '1990-01-01',
  gender: 'female',
  email: '',
  phone: '',
  address: '',
  insurance_provider: '',
  status: 'active',
};

function Toast({ message }) {
  return message ? <div className="toast">{message}</div> : null;
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function App() {
  const [active, setActive] = useState('overview');
  const [query, setQuery] = useState('');
  const [apiState, setApiState] = useState('Connecting');
  const [dashboard, setDashboard] = useState(dashboardFallback);
  const [patients, setPatients] = useState(patientsFallback);
  const [appointments, setAppointments] = useState(dashboardFallback.upcoming_appointments);
  const [patientForm, setPatientForm] = useState(emptyPatient);
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '',
    scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    type: 'consultation',
    reason: 'Routine care visit',
  });
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      await login();
      const [dashboardData, patientData, appointmentData] = await Promise.all([
        getDashboard(),
        getPatients(),
        getAppointments(),
      ]);
      setDashboard(dashboardData);
      setPatients(patientData);
      setAppointments(appointmentData);
      setAppointmentForm((current) => ({ ...current, patient_id: patientData[0]?.id || '' }));
      setApiState('Live API');
    } catch (error) {
      setApiState('Demo mode');
      setAppointmentForm((current) => ({ ...current, patient_id: patientsFallback[0]?.id || '' }));
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredPatients = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return patients;
    return patients.filter((patient) => `${patient.first_name} ${patient.last_name} ${patient.email} ${patient.phone} ${patient.insurance_provider}`
      .toLowerCase()
      .includes(value));
  }, [patients, query]);

  const filteredAppointments = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return appointments;
    return appointments.filter((appointment) => `${appointment.patient?.first_name} ${appointment.patient?.last_name} ${appointment.type} ${appointment.status}`
      .toLowerCase()
      .includes(value));
  }, [appointments, query]);

  const activePatients = patients.filter((patient) => patient.status === 'active').length;

  async function submitPatient(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await createPatient(patientForm);
      setPatients((current) => [created, ...current]);
      setPatientForm(emptyPatient);
      setToast('Patient saved.');
      setActive('patients');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not save patient. Check required fields.');
    } finally {
      setSaving(false);
    }
  }

  async function submitAppointment(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await createAppointment({
        ...appointmentForm,
        doctor_id: 2,
        status: 'scheduled',
        scheduled_at: appointmentForm.scheduled_at.replace('T', ' '),
      });
      setAppointments((current) => [created, ...current]);
      setToast('Appointment booked.');
      setActive('appointments');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not book appointment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <Toast message={toast} />

      <aside className="sidebar">
        <div className="brand">
          <span><HeartPulse size={24} /></span>
          <div>
            <strong>HealthCRM</strong>
            <small>Clinic workspace</small>
          </div>
        </div>

        <nav>
          {navItems.map(([id, label, Icon]) => (
            <button className={active === id ? 'active' : ''} key={id} type="button" onClick={() => setActive(id)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="connection">
          <CheckCircle2 size={17} />
          <span>{apiState}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>{apiState}</p>
            <h1>{navItems.find(([id]) => id === active)?.[1]}</h1>
            <span>Manage patients and appointments from one simple screen.</span>
          </div>
          <label className="search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patients or appointments" />
          </label>
        </header>

        <section className="metrics">
          <article>
            <span>Total patients</span>
            <strong>{patients.length}</strong>
            <small>{activePatients} active</small>
          </article>
          <article>
            <span>Appointments</span>
            <strong>{appointments.length}</strong>
            <small>{filteredAppointments.length} visible</small>
          </article>
          <article>
            <span>Monthly revenue</span>
            <strong>${Number(dashboard.monthly_revenue || 0).toLocaleString()}</strong>
            <small>Paid invoices</small>
          </article>
          <article>
            <span>Search results</span>
            <strong>{filteredPatients.length + filteredAppointments.length}</strong>
            <small>Visible rows</small>
          </article>
        </section>

        {(active === 'overview' || active === 'patients') && (
          <section className="split">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Patients</h2>
                  <span>Click Patients in the menu, or add a new patient here.</span>
                </div>
                <button type="button" onClick={() => setActive('patients')}><Users size={16} /> Open</button>
              </div>
              <table>
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Insurance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <strong>{patient.first_name} {patient.last_name}</strong>
                        <small>{patient.email}</small>
                      </td>
                      <td>{patient.phone}</td>
                      <td>{patient.insurance_provider || 'Self pay'}</td>
                      <td><span className={`status ${patient.status}`}>{patient.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <form className="panel form-panel" onSubmit={submitPatient}>
              <div className="panel-head">
                <div>
                  <h2>Add Patient</h2>
                  <span>This writes to the Laravel API.</span>
                </div>
                <UserPlus size={20} />
              </div>
              <div className="form-grid">
                <Field label="First name"><input required value={patientForm.first_name} onChange={(event) => setPatientForm({ ...patientForm, first_name: event.target.value })} /></Field>
                <Field label="Last name"><input required value={patientForm.last_name} onChange={(event) => setPatientForm({ ...patientForm, last_name: event.target.value })} /></Field>
                <Field label="Email"><input required type="email" value={patientForm.email} onChange={(event) => setPatientForm({ ...patientForm, email: event.target.value })} /></Field>
                <Field label="Phone"><input required value={patientForm.phone} onChange={(event) => setPatientForm({ ...patientForm, phone: event.target.value })} /></Field>
                <Field label="Birth date"><input required type="date" value={patientForm.date_of_birth} onChange={(event) => setPatientForm({ ...patientForm, date_of_birth: event.target.value })} /></Field>
                <Field label="Gender">
                  <select value={patientForm.gender} onChange={(event) => setPatientForm({ ...patientForm, gender: event.target.value })}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </Field>
                <Field label="Insurance"><input value={patientForm.insurance_provider} onChange={(event) => setPatientForm({ ...patientForm, insurance_provider: event.target.value })} /></Field>
                <Field label="Address"><input value={patientForm.address} onChange={(event) => setPatientForm({ ...patientForm, address: event.target.value })} /></Field>
              </div>
              <button className="primary" disabled={saving} type="submit"><Plus size={17} /> Save patient</button>
            </form>
          </section>
        )}

        {(active === 'overview' || active === 'appointments') && (
          <section className="split">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Appointments</h2>
                  <span>Upcoming and recent scheduled visits.</span>
                </div>
                <button type="button" onClick={() => setActive('appointments')}><CalendarDays size={16} /> Open</button>
              </div>
              <div className="appointment-list">
                {filteredAppointments.map((appointment) => (
                  <div className="appointment" key={appointment.id}>
                    <time>{new Date(appointment.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                    <div>
                      <strong>{appointment.patient?.first_name} {appointment.patient?.last_name}</strong>
                      <small>{appointment.type?.replace('_', ' ')} with {appointment.doctor?.name}</small>
                    </div>
                    <span className={`status ${appointment.status}`}>{appointment.status}</span>
                  </div>
                ))}
              </div>
            </article>

            <form className="panel form-panel" onSubmit={submitAppointment}>
              <div className="panel-head">
                <div>
                  <h2>Book Appointment</h2>
                  <span>This creates a scheduled appointment.</span>
                </div>
                <CalendarDays size={20} />
              </div>
              <div className="form-grid single">
                <Field label="Patient">
                  <select required value={appointmentForm.patient_id} onChange={(event) => setAppointmentForm({ ...appointmentForm, patient_id: event.target.value })}>
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Date and time"><input required type="datetime-local" value={appointmentForm.scheduled_at} onChange={(event) => setAppointmentForm({ ...appointmentForm, scheduled_at: event.target.value })} /></Field>
                <Field label="Visit type">
                  <select value={appointmentForm.type} onChange={(event) => setAppointmentForm({ ...appointmentForm, type: event.target.value })}>
                    <option value="consultation">Consultation</option>
                    <option value="follow_up">Follow up</option>
                    <option value="lab_review">Lab review</option>
                    <option value="procedure">Procedure</option>
                  </select>
                </Field>
                <Field label="Reason"><input value={appointmentForm.reason} onChange={(event) => setAppointmentForm({ ...appointmentForm, reason: event.target.value })} /></Field>
              </div>
              <button className="primary" disabled={saving} type="submit"><Plus size={17} /> Book appointment</button>
            </form>
          </section>
        )}

        {(active === 'billing' || active === 'records' || active === 'access') && (
          <section className="panel simple-panel">
            <h2>{navItems.find(([id]) => id === active)?.[1]}</h2>
            <p>
              This section is prepared in the backend, but the full screen is not built yet.
              The working parts right now are patient management and appointment booking.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
