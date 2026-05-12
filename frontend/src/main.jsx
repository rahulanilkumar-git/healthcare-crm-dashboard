import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Edit3,
  FileText,
  HeartPulse,
  LockKeyhole,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Trash2,
  UserCircle,
  UserPlus,
  Users,
} from 'lucide-react';
import { dashboardFallback, patientsFallback } from './features/demoData';
import {
  createAppointment,
  createInvoice,
  createPatient,
  createPayment,
  createStripeCheckout,
  createUser,
  deleteAppointment,
  deleteInvoice,
  deletePatient,
  deleteUser,
  addPatientHistory,
  getAppointments,
  getCurrentUser,
  getDashboard,
  getPatientHistory,
  getPatientInvoices,
  getPatientStats,
  getPatients,
  getPaymentReceipt,
  getUsers,
  getAppointmentStats,
  getRevenue,
  login,
  logout,
  confirmStripeCheckout,
  updateAppointment,
  updateInvoice,
  updatePatient,
  updateUser,
} from './services/api';
import './styles.css';

const navItems = [
  ['overview', 'Overview', HeartPulse],
  ['patients', 'Patients', Users],
  ['appointments', 'Appointments', CalendarDays],
  ['billing', 'Billing', CreditCard],
  ['records', 'Records', ClipboardList],
  ['analytics', 'Analytics', BarChart3],
  ['access', 'Access', ShieldCheck],
];

const roleCapabilities = [
  ['Admin', 'Full access to patients, appointments, billing, records, and analytics.'],
  ['Doctor', 'Can manage patient care, appointments, medical history, and analytics.'],
  ['Patient', 'Designed for future patient self-service views and invoice access.'],
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

const emptyUser = {
  name: '',
  email: '',
  password: '',
  role: 'doctor',
};

function toDateTimeInput(value) {
  if (!value) return new Date(Date.now() + 86400000).toISOString().slice(0, 16);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date(Date.now() + 86400000).toISOString().slice(0, 16);

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

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
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: 'admin@healthcrm.test', password: 'password123' });
  const [loginError, setLoginError] = useState('');
  const [dashboard, setDashboard] = useState(dashboardFallback);
  const [patients, setPatients] = useState(patientsFallback);
  const [appointments, setAppointments] = useState(dashboardFallback.upcoming_appointments);
  const [users, setUsers] = useState([]);
  const [patientForm, setPatientForm] = useState(emptyPatient);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [patientStats, setPatientStats] = useState([]);
  const [appointmentStats, setAppointmentStats] = useState([]);
  const [revenueRows, setRevenueRows] = useState([]);
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
  const [userForm, setUserForm] = useState(emptyUser);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadData() {
    let loadedAnyLiveData = false;
    setApiState('Loading data');

    try {
      const dashboardData = await getDashboard();
      setDashboard(dashboardData);
      loadedAnyLiveData = true;
    } catch (error) {
      setDashboard(dashboardFallback);
    }

    try {
      const patientData = await getPatients();
      setPatients(patientData);
      setAppointmentForm((current) => ({ ...current, patient_id: patientData[0]?.id || '' }));
      loadedAnyLiveData = true;
    } catch (error) {
      setPatients(patientsFallback);
      setAppointmentForm((current) => ({ ...current, patient_id: patientsFallback[0]?.id || '' }));
    }

    try {
      const appointmentData = await getAppointments();
      setAppointments(appointmentData);
      loadedAnyLiveData = true;
    } catch (error) {
      setAppointments(dashboardFallback.upcoming_appointments);
    }

    setApiState(loadedAnyLiveData ? 'Live API' : 'Demo mode');
  }

  async function loadAnalytics() {
    try {
      const [patientStatData, appointmentStatData, revenueData] = await Promise.all([
        getPatientStats(),
        getAppointmentStats(),
        getRevenue(),
      ]);
      setPatientStats(patientStatData);
      setAppointmentStats(appointmentStatData);
      setRevenueRows(revenueData);
    } catch (error) {
      setToast('Could not load analytics.');
    }
  }

  async function loadUsers() {
    try {
      setUsers(await getUsers());
    } catch (error) {
      setToast('Could not load users.');
    }
  }

  useEffect(() => {
    async function boot() {
      const token = localStorage.getItem('crm_token');
      if (!token) {
        setApiState('Signed out');
        setAuthReady(true);
        return;
      }

      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        if (user.role === 'patient') setActive('access');
        setAuthReady(true);
        loadData();
        if (user.role === 'admin') loadUsers();
        handleStripeReturn(user);
      } catch (error) {
        localStorage.removeItem('crm_token');
        setApiState('Signed out');
        setAuthReady(true);
      }
    }

    boot();
  }, []);

  useEffect(() => {
    if (currentUser && active === 'analytics' && !patientStats.length && !appointmentStats.length && !revenueRows.length) {
      loadAnalytics();
    }
  }, [active, currentUser, patientStats.length, appointmentStats.length, revenueRows.length]);

  async function handleStripeReturn(user = currentUser) {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    const sessionId = params.get('session_id');

    if (!stripeStatus) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    if (stripeStatus === 'cancelled') {
      setToast('Stripe checkout was cancelled.');
      return;
    }

    if (stripeStatus === 'success' && sessionId && user?.role === 'admin') {
      try {
        const payment = await confirmStripeCheckout(sessionId);
        setSelectedReceipt({
          receipt_number: `RCT-${payment.id}`,
          payment,
          issued_at: payment.paid_at || new Date().toISOString(),
        });
        if (payment.patient_id) {
          setSelectedInvoices(await getPatientInvoices(payment.patient_id));
        }
        setActive('billing');
        setToast('Stripe test payment confirmed.');
      } catch (error) {
        setToast(error.response?.data?.message || 'Could not confirm Stripe payment.');
      }
    }
  }

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
  const totalRevenue = revenueRows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  async function submitLogin(event) {
    event.preventDefault();
    setSaving(true);
    setLoginError('');
    try {
      const user = await login(loginForm.email, loginForm.password);
      setCurrentUser(user);
      if (user.role === 'patient') setActive('access');
      loadData();
      if (user.role === 'admin') loadUsers();
      setToast(`Welcome, ${user.name}.`);
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Could not sign in. Check the API and credentials.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await logout();
    setCurrentUser(null);
    setActive('overview');
    setQuery('');
    setDashboard(dashboardFallback);
    setPatients(patientsFallback);
    setAppointments(dashboardFallback.upcoming_appointments);
    setUsers([]);
    setSelectedPatient(null);
    setSelectedHistory([]);
    setSelectedInvoices([]);
    setSelectedReceipt(null);
    setPatientStats([]);
    setAppointmentStats([]);
    setRevenueRows([]);
    setApiState('Signed out');
    setToast('Signed out.');
  }

  const visibleNavItems = navItems.filter(([id]) => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.role === 'doctor') return !['billing'].includes(id);
    return ['access'].includes(id);
  });

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
    setSelectedReceipt(null);
    setActive(nextActive);
    try {
      const [history, invoices] = await Promise.all([
        getPatientHistory(patient.id),
        currentUser?.role === 'admin' ? getPatientInvoices(patient.id) : Promise.resolve([]),
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
      const payload = {
        ...appointmentForm,
        doctor_id: 2,
        status: appointmentForm.status || 'scheduled',
        scheduled_at: appointmentForm.scheduled_at.replace('T', ' '),
      };

      if (editingAppointmentId) {
        const updated = await updateAppointment(editingAppointmentId, payload);
        setAppointments((current) => current.map((appointment) => (appointment.id === editingAppointmentId ? updated : appointment)));
        setEditingAppointmentId(null);
        setToast('Appointment updated.');
      } else {
        const created = await createAppointment(payload);
        setAppointments((current) => [created, ...current]);
        setToast('Appointment booked.');
      }

      setAppointmentForm({
        patient_id: patients[0]?.id || '',
        scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        type: 'consultation',
        reason: 'Routine care visit',
        status: 'scheduled',
      });
      setActive('appointments');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not book appointment.');
    } finally {
      setSaving(false);
    }
  }

  function editAppointment(appointment) {
    setEditingAppointmentId(appointment.id);
    setAppointmentForm({
      patient_id: appointment.patient_id || appointment.patient?.id || '',
      scheduled_at: toDateTimeInput(appointment.scheduled_at),
      type: appointment.type || 'consultation',
      reason: appointment.reason || '',
      status: appointment.status || 'scheduled',
    });
    setActive('appointments');
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
      const payload = {
        ...invoiceForm,
        amount: Number(invoiceForm.amount),
      };

      if (editingInvoiceId) {
        const updated = await updateInvoice(editingInvoiceId, payload);
        setSelectedInvoices((current) => current.map((invoice) => (invoice.id === editingInvoiceId ? updated : invoice)));
        setEditingInvoiceId(null);
        setToast('Invoice updated.');
      } else {
        const created = await createInvoice(selectedPatient.id, payload);
        setSelectedInvoices((current) => [created, ...current]);
        setToast('Invoice created.');
      }

      setInvoiceForm({
        amount: '',
        due_date: new Date(Date.now() + 1209600000).toISOString().slice(0, 10),
        description: 'Clinical services',
        status: 'sent',
      });
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not create invoice.');
    } finally {
      setSaving(false);
    }
  }

  function editInvoice(invoice) {
    setEditingInvoiceId(invoice.id);
    setInvoiceForm({
      amount: invoice.amount || '',
      due_date: invoice.due_date?.slice(0, 10) || new Date(Date.now() + 1209600000).toISOString().slice(0, 10),
      description: invoice.description || 'Clinical services',
      status: invoice.status || 'sent',
    });
    setSelectedReceipt(null);
  }

  async function removeInvoice(id) {
    if (!window.confirm('Delete this invoice and related payments?')) return;
    try {
      await deleteInvoice(id);
      setSelectedInvoices((current) => current.filter((invoice) => invoice.id !== id));
      if (editingInvoiceId === id) setEditingInvoiceId(null);
      setSelectedReceipt(null);
      setToast('Invoice deleted.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not delete invoice.');
    }
  }

  async function payInvoice(invoice) {
    try {
      const payment = await createPayment({
        invoice_id: invoice.id,
        patient_id: invoice.patient_id,
        amount: invoice.amount,
        currency: 'USD',
      });
      setSelectedReceipt(await getPaymentReceipt(payment.id));
      if (selectedPatient) {
        setSelectedInvoices(await getPatientInvoices(selectedPatient.id));
      }
      setToast('Invoice paid.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not record payment.');
    }
  }

  async function startStripeCheckout(invoice) {
    try {
      const checkout = await createStripeCheckout(invoice.id);
      window.location.href = checkout.checkout_url;
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not start Stripe checkout.');
    }
  }

  async function viewReceipt(invoice) {
    const paymentId = invoice.payments?.[0]?.id;
    if (!paymentId) {
      setToast('No payment receipt is available for this invoice yet.');
      return;
    }

    try {
      setSelectedReceipt(await getPaymentReceipt(paymentId));
      setToast('Receipt loaded.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not load receipt.');
    }
  }

  async function submitUser(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...userForm };
      if (editingUserId && !payload.password) delete payload.password;

      if (editingUserId) {
        const updated = await updateUser(editingUserId, payload);
        setUsers((current) => current.map((user) => (user.id === editingUserId ? updated : user)));
        setEditingUserId(null);
        setToast('User updated.');
      } else {
        const created = await createUser(payload);
        setUsers((current) => [created, ...current]);
        setToast('User created.');
      }

      setUserForm(emptyUser);
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not save user.');
    } finally {
      setSaving(false);
    }
  }

  function editUser(user) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'doctor',
    });
  }

  async function removeUser(id) {
    if (!window.confirm('Delete this user account?')) return;
    try {
      await deleteUser(id);
      setUsers((current) => current.filter((user) => user.id !== id));
      setToast('User deleted.');
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not delete user.');
    }
  }

  if (!authReady) {
    return (
      <main className="login-shell">
        <div className="login-card">
          <HeartPulse size={34} />
          <h1>HealthCRM</h1>
          <p>Connecting to the clinic workspace.</p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="login-shell">
        <Toast message={toast} />
        <form className="login-card" onSubmit={submitLogin}>
          <span className="login-mark"><HeartPulse size={28} /></span>
          <div>
            <h1>HealthCRM</h1>
            <p>Sign in to manage patients, appointments, records, and billing.</p>
          </div>
          <Field label="Email">
            <input disabled={saving} required type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} />
          </Field>
          <Field label="Password">
            <input disabled={saving} required type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
          </Field>
          {loginError && <p className="form-error">{loginError}</p>}
          <button className="primary" disabled={saving} type="submit" aria-busy={saving}>
            {saving ? <span className="button-spinner" aria-hidden="true" /> : <LockKeyhole size={17} />}
            {saving ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="login-hint">Seed login: admin@healthcrm.test / password123</p>
        </form>
      </main>
    );
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
          {visibleNavItems.map(([id, label, Icon]) => (
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
          <div className="top-actions">
            <label className="search">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patients or appointments" />
            </label>
            <div className="user-chip">
              <UserCircle size={20} />
              <div>
                <strong>{currentUser.name}</strong>
                <small>{currentUser.role}</small>
              </div>
            </div>
            <button className="icon-action" type="button" onClick={signOut}><LogOut size={17} /> Logout</button>
          </div>
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
                      <button type="button" onClick={() => editAppointment(appointment)}><Edit3 size={15} /> Edit</button>
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
                {editingAppointmentId && (
                  <Field label="Status">
                    <select value={appointmentForm.status} onChange={(event) => setAppointmentForm({ ...appointmentForm, status: event.target.value })}>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No show</option>
                    </select>
                  </Field>
                )}
                <Field label="Reason"><input value={appointmentForm.reason} onChange={(event) => setAppointmentForm({ ...appointmentForm, reason: event.target.value })} /></Field>
              </div>
              <button className="primary" disabled={saving} type="submit"><Plus size={17} /> {editingAppointmentId ? 'Update appointment' : 'Book appointment'}</button>
              {editingAppointmentId && (
                <button className="secondary" type="button" onClick={() => {
                  setEditingAppointmentId(null);
                  setAppointmentForm({
                    patient_id: patients[0]?.id || '',
                    scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                    type: 'consultation',
                    reason: 'Routine care visit',
                    status: 'scheduled',
                  });
                }}>Cancel edit</button>
              )}
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
                        <td>
                          <div className="row-actions">
                          {invoice.status === 'paid' ? (
                            <button className="inline-action" type="button" onClick={() => viewReceipt(invoice)}><ReceiptText size={14} /> Receipt</button>
                          ) : (
                            <>
                              <button className="inline-action" type="button" onClick={() => startStripeCheckout(invoice)}>Stripe test</button>
                              <button className="inline-action" type="button" onClick={() => payInvoice(invoice)}>Local pay</button>
                            </>
                          )}
                            <button type="button" onClick={() => editInvoice(invoice)}><Edit3 size={15} /> Edit</button>
                            <button type="button" onClick={() => removeInvoice(invoice.id)}><Trash2 size={15} /> Delete</button>
                          </div>
                        </td>
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
                  <h2>{editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}</h2>
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
              <button className="primary" disabled={saving || !selectedPatient} type="submit"><Plus size={17} /> {editingInvoiceId ? 'Update invoice' : 'Create invoice'}</button>
              {editingInvoiceId && (
                <button className="secondary" type="button" onClick={() => {
                  setEditingInvoiceId(null);
                  setInvoiceForm({
                    amount: '',
                    due_date: new Date(Date.now() + 1209600000).toISOString().slice(0, 10),
                    description: 'Clinical services',
                    status: 'sent',
                  });
                }}>Cancel edit</button>
              )}
              {selectedReceipt && (
                <div className="receipt-card">
                  <div>
                    <span>Receipt</span>
                    <strong>{selectedReceipt.receipt_number}</strong>
                  </div>
                  <p>{selectedReceipt.payment.patient.first_name} {selectedReceipt.payment.patient.last_name}</p>
                  <dl>
                    <div><dt>Amount</dt><dd>${Number(selectedReceipt.payment.amount).toLocaleString()}</dd></div>
                    <div><dt>Status</dt><dd>{selectedReceipt.payment.status}</dd></div>
                    <div><dt>Issued</dt><dd>{new Date(selectedReceipt.issued_at).toLocaleString()}</dd></div>
                  </dl>
                </div>
              )}
            </form>
          </section>
        )}

        {active === 'analytics' && (
          <section className="analytics-layout">
            <article className="panel analytics-hero">
              <div className="panel-head">
                <div>
                  <h2>Analytics</h2>
                  <span>Simple operational totals without noisy charts.</span>
                </div>
                <BarChart3 size={22} />
              </div>
              <div className="analytics-metrics">
                <div>
                  <span>Revenue collected</span>
                  <strong>${totalRevenue.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Patient groups</span>
                  <strong>{patientStats.length}</strong>
                </div>
                <div>
                  <span>Appointment states</span>
                  <strong>{appointmentStats.length}</strong>
                </div>
              </div>
            </article>

            <section className="split">
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Revenue By Month</h2>
                    <span>Paid payment totals from the API.</span>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr><th>Month</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {revenueRows.map((row) => (
                      <tr key={row.month}>
                        <td>{row.month}</td>
                        <td>${Number(row.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Status Summary</h2>
                    <span>Current patients and appointments.</span>
                  </div>
                </div>
                <div className="status-lists">
                  <div>
                    <h3>Patients</h3>
                    {patientStats.map((row) => (
                      <p key={row.status}><span className={`status ${row.status}`}>{row.status}</span><strong>{row.total}</strong></p>
                    ))}
                  </div>
                  <div>
                    <h3>Appointments</h3>
                    {appointmentStats.map((row) => (
                      <p key={row.status}><span className={`status ${row.status}`}>{row.status}</span><strong>{row.total}</strong></p>
                    ))}
                  </div>
                </div>
              </article>
            </section>
          </section>
        )}

        {active === 'access' && (
          <section className="split">
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>Signed In User</h2>
                  <span>JWT authentication is active for every API request.</span>
                </div>
                <ShieldCheck size={21} />
              </div>
              <div className="profile-block">
                <UserCircle size={42} />
                <div>
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.email}</span>
                  <small>{currentUser.role}</small>
                </div>
              </div>
              <button className="secondary" type="button" onClick={signOut}><LogOut size={17} /> Sign out</button>
              {currentUser.role === 'admin' && (
                <div className="user-table">
                  <h3>User Accounts</h3>
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td><span className={`status ${user.role}`}>{user.role}</span></td>
                          <td>
                            <div className="row-actions">
                              <button type="button" onClick={() => editUser(user)}><Edit3 size={15} /> Edit</button>
                              <button type="button" disabled={user.id === currentUser.id} onClick={() => removeUser(user.id)}><Trash2 size={15} /> Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <form className="panel form-panel" onSubmit={submitUser}>
              <div className="panel-head">
                <div>
                  <h2>{editingUserId ? 'Edit User' : 'Create User'}</h2>
                  <span>Admin-only account management.</span>
                </div>
                <UserPlus size={20} />
              </div>
              {currentUser.role === 'admin' ? (
                <>
                  <div className="form-grid single">
                    <Field label="Name"><input required value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} /></Field>
                    <Field label="Email"><input required type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} /></Field>
                    <Field label={editingUserId ? 'Password optional' : 'Password'}><input required={!editingUserId} minLength="8" type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} /></Field>
                    <Field label="Role">
                      <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
                        <option value="admin">Admin</option>
                        <option value="doctor">Doctor</option>
                        <option value="patient">Patient</option>
                      </select>
                    </Field>
                  </div>
                  <button className="primary" disabled={saving} type="submit"><Plus size={17} /> {editingUserId ? 'Update user' : 'Create user'}</button>
                  {editingUserId && (
                    <button className="secondary" type="button" onClick={() => { setEditingUserId(null); setUserForm(emptyUser); }}>Cancel edit</button>
                  )}
                </>
              ) : (
                <p className="muted">Only admins can create or update users.</p>
              )}
            </form>

            <article className="panel roles-panel">
              <div className="panel-head">
                <div>
                  <h2>Roles</h2>
                  <span>Seeded accounts and permission model.</span>
                </div>
              </div>
              <div className="access-grid">
                {roleCapabilities.map(([role, description]) => (
                  <div className="detail-card" key={role}>
                    <strong>{role}</strong>
                    <p>{description}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
