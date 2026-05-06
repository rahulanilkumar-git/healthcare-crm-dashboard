import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit3,
  FileText,
  HeartPulse,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { dashboardFallback, patientsFallback } from './features/demoData';
import {
  createAppointment,
  createInvoice,
  createPatient,
  createPayment,
  deleteAppointment,
  deletePatient,
  addPatientHistory,
  getAppointments,
  getDashboard,
  getPatientHistory,
  getPatientInvoices,
  getPatients,
  login,
  updateAppointment,
  updatePatient,
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
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [historyForm, setHistoryForm] = useState({ condition: '', medications: '', allergies: '', notes: '' });
  const [invoiceForm, setInvoiceForm] = useState({
    amount: '',
    due_date: new Date(Date.now() + 1209600000).toISOString().slice(0, 10),
    description: 'Clinical services',
    status: 'sent',
  });
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
      if (editingPatientId) {
        const updated = await updatePatient(editingPatientId, patientForm);
        setPatients((current) => current.map((patient) => (patient.id === editingPatientId ? updated : patient)));
        setToast('Patient updated.');
      } else {
        const created = await createPatient(patientForm);
        setPatients((current) => [created, ...current]);
        setToast('Patient saved.');
      }
      setPatientForm(emptyPatient);
      setEditingPatientId(null);
      setActive('patients');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not save patient. Check required fields.');
    } finally {
      setSaving(false);
    }
  }

  function editPatient(patient) {
    setEditingPatientId(patient.id);
    setPatientForm({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      date_of_birth: patient.date_of_birth?.slice(0, 10) || '1990-01-01',
      gender: patient.gender || 'female',
      email: patient.email || '',
      phone: patient.phone || '',
      address: patient.address || '',
      insurance_provider: patient.insurance_provider || '',
      status: patient.status || 'active',
    });
    setActive('patients');
  }

  async function removePatient(id) {
    if (!window.confirm('Delete this patient and related records?')) return;
    try {
      await deletePatient(id);
      setPatients((current) => current.filter((patient) => patient.id !== id));
      setAppointments((current) => current.filter((appointment) => appointment.patient?.id !== id));
      if (selectedPatient?.id === id) setSelectedPatient(null);
      setToast('Patient deleted.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not delete patient.');
    }
  }

  async function openPatient(patient, nextActive = 'records') {
    setSelectedPatient(patient);
    setActive(nextActive);
    try {
      const [history, invoices] = await Promise.all([
        getPatientHistory(patient.id),
        getPatientInvoices(patient.id),
      ]);
      setSelectedHistory(history);
      setSelectedInvoices(invoices);
    } catch (error) {
      setToast('Could not load patient detail.');
    }
  }

  async function chooseBillingPatient(patientId) {
    const patient = patients.find((item) => String(item.id) === String(patientId));
    if (patient) await openPatient(patient, 'billing');
  }

  async function submitHistory(event) {
    event.preventDefault();
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const created = await addPatientHistory(selectedPatient.id, historyForm);
      setSelectedHistory((current) => [created, ...current]);
      setHistoryForm({ condition: '', medications: '', allergies: '', notes: '' });
      setToast('Medical history added.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not add medical history.');
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

  async function changeAppointmentStatus(appointment, status) {
    try {
      const updated = await updateAppointment(appointment.id, {
        patient_id: appointment.patient_id || appointment.patient?.id,
        doctor_id: appointment.doctor_id || appointment.doctor?.id || 2,
        scheduled_at: appointment.scheduled_at,
        type: appointment.type,
        status,
        reason: appointment.reason,
        notes: appointment.notes,
      });
      setAppointments((current) => current.map((item) => (item.id === appointment.id ? updated : item)));
      setToast(`Appointment marked ${status.replace('_', ' ')}.`);
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not update appointment.');
    }
  }

  async function removeAppointment(id) {
    if (!window.confirm('Delete this appointment?')) return;
    try {
      await deleteAppointment(id);
      setAppointments((current) => current.filter((appointment) => appointment.id !== id));
      setToast('Appointment deleted.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not delete appointment.');
    }
  }

  async function submitInvoice(event) {
    event.preventDefault();
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const created = await createInvoice(selectedPatient.id, {
        ...invoiceForm,
        amount: Number(invoiceForm.amount),
      });
      setSelectedInvoices((current) => [created, ...current]);
      setInvoiceForm({
        amount: '',
        due_date: new Date(Date.now() + 1209600000).toISOString().slice(0, 10),
        description: 'Clinical services',
        status: 'sent',
      });
      setToast('Invoice created.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not create invoice.');
    } finally {
      setSaving(false);
    }
  }

  async function payInvoice(invoice) {
    try {
      await createPayment({
        invoice_id: invoice.id,
        patient_id: invoice.patient_id,
        amount: invoice.amount,
        currency: 'USD',
      });
      if (selectedPatient) {
        setSelectedInvoices(await getPatientInvoices(selectedPatient.id));
      }
      setToast('Invoice paid.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not record payment.');
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
                  <tr><th>Name</th><th>Phone</th><th>Insurance</th><th>Status</th><th>Actions</th></tr>
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
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => openPatient(patient)}><FileText size={15} /> Detail</button>
                          <button type="button" onClick={() => editPatient(patient)}><Edit3 size={15} /> Edit</button>
                          <button type="button" onClick={() => removePatient(patient.id)}><Trash2 size={15} /> Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <form className="panel form-panel" onSubmit={submitPatient}>
              <div className="panel-head">
                <div>
                  <h2>{editingPatientId ? 'Edit Patient' : 'Add Patient'}</h2>
                  <span>{editingPatientId ? 'Update the selected patient.' : 'This writes to the Laravel API.'}</span>
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
              {editingPatientId && (
                <button className="secondary" type="button" onClick={() => { setEditingPatientId(null); setPatientForm(emptyPatient); }}>Cancel edit</button>
              )}
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
                    <div className="row-actions">
                      <button type="button" onClick={() => changeAppointmentStatus(appointment, 'completed')}>Complete</button>
                      <button type="button" onClick={() => changeAppointmentStatus(appointment, 'cancelled')}>Cancel</button>
                      <button type="button" onClick={() => removeAppointment(appointment.id)}><Trash2 size={15} /> Delete</button>
                    </div>
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

        {active === 'records' && (
          <section className="split">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Patient Detail</h2>
                  <span>{selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Choose Detail from the patient list.'}</span>
                </div>
              </div>
              {selectedPatient ? (
                <div className="detail-stack">
                  <p><strong>Email:</strong> {selectedPatient.email}</p>
                  <p><strong>Phone:</strong> {selectedPatient.phone}</p>
                  <p><strong>Insurance:</strong> {selectedPatient.insurance_provider || 'Self pay'}</p>
                  <h3>Medical History</h3>
                  {selectedHistory.map((item) => (
                    <div className="detail-card" key={item.id}>
                      <strong>{item.condition}</strong>
                      <small>{new Date(item.recorded_at).toLocaleDateString()}</small>
                      <p>{item.notes || 'No notes'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No patient selected.</p>
              )}
            </article>

            <form className="panel form-panel" onSubmit={submitHistory}>
              <div className="panel-head">
                <div>
                  <h2>Add Medical History</h2>
                  <span>Stores a clinical note for selected patient.</span>
                </div>
              </div>
              <div className="form-grid single">
                <Field label="Condition"><input required disabled={!selectedPatient} value={historyForm.condition} onChange={(event) => setHistoryForm({ ...historyForm, condition: event.target.value })} /></Field>
                <Field label="Medications"><input disabled={!selectedPatient} value={historyForm.medications} onChange={(event) => setHistoryForm({ ...historyForm, medications: event.target.value })} /></Field>
                <Field label="Allergies"><input disabled={!selectedPatient} value={historyForm.allergies} onChange={(event) => setHistoryForm({ ...historyForm, allergies: event.target.value })} /></Field>
                <Field label="Notes"><input disabled={!selectedPatient} value={historyForm.notes} onChange={(event) => setHistoryForm({ ...historyForm, notes: event.target.value })} /></Field>
              </div>
              <button className="primary" disabled={saving || !selectedPatient} type="submit"><Plus size={17} /> Add history</button>
            </form>
          </section>
        )}

        {active === 'billing' && (
          <section className="split">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Billing</h2>
                  <span>{selectedPatient ? `Invoices for ${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Choose a patient to load invoices.'}</span>
                </div>
              </div>
              <Field label="Patient">
                <select value={selectedPatient?.id || ''} onChange={(event) => chooseBillingPatient(event.target.value)}>
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>
                  ))}
                </select>
              </Field>
              {selectedInvoices.length ? (
                <table className="billing-table">
                  <thead>
                    <tr><th>Invoice</th><th>Amount</th><th>Status</th><th>Due</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {selectedInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoice_number}</td>
                        <td>${Number(invoice.amount).toLocaleString()}</td>
                        <td><span className={`status ${invoice.status}`}>{invoice.status}</span></td>
                        <td>{invoice.due_date}</td>
                        <td>{invoice.status !== 'paid' && <button className="inline-action" type="button" onClick={() => payInvoice(invoice)}>Pay</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No invoices loaded yet.</p>
              )}
            </article>

            <form className="panel form-panel" onSubmit={submitInvoice}>
              <div className="panel-head">
                <div>
                  <h2>Create Invoice</h2>
                  <span>{selectedPatient ? `Bill ${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Select a patient first.'}</span>
                </div>
              </div>
              <div className="form-grid single">
                <Field label="Amount"><input required disabled={!selectedPatient} min="1" step="0.01" type="number" value={invoiceForm.amount} onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: event.target.value })} /></Field>
                <Field label="Due date"><input required disabled={!selectedPatient} type="date" value={invoiceForm.due_date} onChange={(event) => setInvoiceForm({ ...invoiceForm, due_date: event.target.value })} /></Field>
                <Field label="Description"><input required disabled={!selectedPatient} value={invoiceForm.description} onChange={(event) => setInvoiceForm({ ...invoiceForm, description: event.target.value })} /></Field>
                <Field label="Status">
                  <select disabled={!selectedPatient} value={invoiceForm.status} onChange={(event) => setInvoiceForm({ ...invoiceForm, status: event.target.value })}>
                    <option value="sent">Sent</option>
                    <option value="draft">Draft</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </Field>
              </div>
              <button className="primary" disabled={saving || !selectedPatient} type="submit"><Plus size={17} /> Create invoice</button>
            </form>
          </section>
        )}

        {active === 'access' && (
          <section className="panel simple-panel">
            <h2>{navItems.find(([id]) => id === active)?.[1]}</h2>
            <p>
              Admin, doctor, and patient roles are seeded in the database. The remaining work is enforcing permissions per screen and adding a user management page.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
