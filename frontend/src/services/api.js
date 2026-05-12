import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(email = 'admin@healthcrm.test', password = 'password123') {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('crm_token', data.token);
  return data.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('crm_token');
  }
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function getUsers() {
  const { data } = await api.get('/users?per_page=20');
  return data.data || data;
}

export async function createUser(payload) {
  const { data } = await api.post('/users', payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await api.put(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}`);
}

export async function getDashboard() {
  const { data } = await api.get('/analytics/dashboard');
  return data;
}

export async function getPatients() {
  const { data } = await api.get('/patients?per_page=8');
  return data.data || data;
}

export async function getAppointments() {
  const { data } = await api.get('/appointments?per_page=8');
  return data.data || data;
}

export async function createPatient(payload) {
  const { data } = await api.post('/patients', payload);
  return data;
}

export async function updatePatient(id, payload) {
  const { data } = await api.put(`/patients/${id}`, payload);
  return data;
}

export async function deletePatient(id) {
  await api.delete(`/patients/${id}`);
}

export async function getPatientHistory(id) {
  const { data } = await api.get(`/patients/${id}/history`);
  return data;
}

export async function addPatientHistory(id, payload) {
  const { data } = await api.post(`/patients/${id}/history`, payload);
  return data;
}

export async function getPatientInvoices(id) {
  const { data } = await api.get(`/patients/${id}/invoices`);
  return data;
}

export async function createInvoice(patientId, payload) {
  const { data } = await api.post(`/patients/${patientId}/invoices`, payload);
  return data;
}

export async function updateInvoice(id, payload) {
  const { data } = await api.put(`/invoices/${id}`, payload);
  return data;
}

export async function deleteInvoice(id) {
  await api.delete(`/invoices/${id}`);
}

export async function createAppointment(payload) {
  const { data } = await api.post('/appointments', payload);
  return data;
}

export async function updateAppointment(id, payload) {
  const { data } = await api.put(`/appointments/${id}`, payload);
  return data;
}

export async function deleteAppointment(id) {
  await api.delete(`/appointments/${id}`);
}

export async function createPayment(payload) {
  const { data } = await api.post('/payments', payload);
  return data;
}

export async function createStripeCheckout(invoiceId) {
  const { data } = await api.post('/payments/stripe-checkout', { invoice_id: invoiceId });
  return data;
}

export async function confirmStripeCheckout(sessionId) {
  const { data } = await api.post('/payments/stripe-confirm', { session_id: sessionId });
  return data;
}

export async function getPaymentReceipt(id) {
  const { data } = await api.post(`/payments/${id}/receipt`);
  return data;
}

export async function getPatientStats() {
  const { data } = await api.get('/analytics/patients');
  return data;
}

export async function getRevenue() {
  const { data } = await api.get('/analytics/revenue');
  return data;
}

export async function getAppointmentStats() {
  const { data } = await api.get('/analytics/appointments');
  return data;
}

export { api };
