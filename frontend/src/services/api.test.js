import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

const apiMock = {
  interceptors: {
    request: {
      use: vi.fn((callback) => {
        apiMock.requestInterceptor = callback;
      }),
    },
  },
  requestInterceptor: null,
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => apiMock),
  },
}));

const storage = new Map();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: vi.fn((key) => storage.get(key) || null),
    setItem: vi.fn((key, value) => storage.set(key, value)),
    removeItem: vi.fn((key) => storage.delete(key)),
  },
});

describe('API service', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('uses a patient timeout for Docker Laravel dev responses', async () => {
    await import('./api');

    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      timeout: 30000,
    }));
  });

  it('adds the JWT authorization header when a token exists', async () => {
    storage.set('crm_token', 'jwt-token');
    await import('./api');

    const config = apiMock.requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer jwt-token');
  });

  it('leaves request headers unchanged when signed out', async () => {
    await import('./api');

    const config = apiMock.requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('stores and removes the JWT token through auth helpers', async () => {
    const { getCurrentUser, login, logout } = await import('./api');
    apiMock.post.mockResolvedValueOnce({ data: { token: 'jwt-token', user: { name: 'Rahul Admin' } } });
    apiMock.get.mockResolvedValueOnce({ data: { email: 'admin@healthcrm.test', role: 'admin' } });
    apiMock.post.mockResolvedValueOnce({ data: { message: 'Logged out' } });

    await expect(login('admin@healthcrm.test', 'password123')).resolves.toEqual({ name: 'Rahul Admin' });
    await expect(getCurrentUser()).resolves.toEqual({ email: 'admin@healthcrm.test', role: 'admin' });
    await expect(logout()).resolves.toBeUndefined();

    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/auth/login', {
      email: 'admin@healthcrm.test',
      password: 'password123',
    });
    expect(apiMock.get).toHaveBeenCalledWith('/auth/me');
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/auth/logout');
    expect(localStorage.setItem).toHaveBeenCalledWith('crm_token', 'jwt-token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('crm_token');
  });

  it('removes the token when logout fails on the server', async () => {
    const { logout } = await import('./api');
    apiMock.post.mockRejectedValueOnce(new Error('network down'));

    await expect(logout()).rejects.toThrow('network down');

    expect(localStorage.removeItem).toHaveBeenCalledWith('crm_token');
  });

  it('calls patient and medical history endpoints', async () => {
    const {
      addPatientHistory,
      createPatient,
      deletePatient,
      getPatientHistory,
      getPatients,
      updatePatient,
    } = await import('./api');

    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 1, first_name: 'Avery' }] } });
    apiMock.post.mockResolvedValueOnce({ data: { id: 2, first_name: 'Noah' } });
    apiMock.put.mockResolvedValueOnce({ data: { id: 2, status: 'inactive' } });
    apiMock.get.mockResolvedValueOnce({ data: [{ id: 3, condition: 'Hypertension' }] });
    apiMock.post.mockResolvedValueOnce({ data: { id: 4, condition: 'Diabetes' } });
    apiMock.delete.mockResolvedValueOnce({});

    await expect(getPatients()).resolves.toEqual([{ id: 1, first_name: 'Avery' }]);
    await expect(createPatient({ first_name: 'Noah' })).resolves.toEqual({ id: 2, first_name: 'Noah' });
    await expect(updatePatient(2, { status: 'inactive' })).resolves.toEqual({ id: 2, status: 'inactive' });
    await expect(getPatientHistory(2)).resolves.toEqual([{ id: 3, condition: 'Hypertension' }]);
    await expect(addPatientHistory(2, { condition: 'Diabetes' })).resolves.toEqual({ id: 4, condition: 'Diabetes' });
    await expect(deletePatient(2)).resolves.toBeUndefined();

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/patients?per_page=8');
    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/patients', { first_name: 'Noah' });
    expect(apiMock.put).toHaveBeenCalledWith('/patients/2', { status: 'inactive' });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/patients/2/history');
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/patients/2/history', { condition: 'Diabetes' });
    expect(apiMock.delete).toHaveBeenCalledWith('/patients/2');
  });

  it('calls appointment create, update, list, and delete endpoints', async () => {
    const { createAppointment, deleteAppointment, getAppointments, updateAppointment } = await import('./api');
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 10, status: 'scheduled' }] } });
    apiMock.post.mockResolvedValueOnce({ data: { id: 11, status: 'scheduled' } });
    apiMock.put.mockResolvedValueOnce({ data: { id: 11, status: 'completed' } });
    apiMock.delete.mockResolvedValueOnce({});

    await expect(getAppointments()).resolves.toEqual([{ id: 10, status: 'scheduled' }]);
    await expect(createAppointment({ patient_id: 1 })).resolves.toEqual({ id: 11, status: 'scheduled' });
    await expect(updateAppointment(11, { status: 'completed' })).resolves.toEqual({ id: 11, status: 'completed' });
    await expect(deleteAppointment(11)).resolves.toBeUndefined();

    expect(apiMock.get).toHaveBeenCalledWith('/appointments?per_page=8');
    expect(apiMock.post).toHaveBeenCalledWith('/appointments', { patient_id: 1 });
    expect(apiMock.put).toHaveBeenCalledWith('/appointments/11', { status: 'completed' });
    expect(apiMock.delete).toHaveBeenCalledWith('/appointments/11');
  });

  it('calls billing invoice, payment, and receipt endpoints', async () => {
    const {
      createInvoice,
      createPayment,
      createStripeCheckout,
      confirmStripeCheckout,
      deleteInvoice,
      getPatientInvoices,
      getPaymentReceipt,
      updateInvoice,
    } = await import('./api');

    apiMock.get.mockResolvedValueOnce({ data: [{ id: 20, status: 'sent' }] });
    apiMock.post.mockResolvedValueOnce({ data: { id: 21, status: 'sent' } });
    apiMock.put.mockResolvedValueOnce({ data: { id: 21, status: 'paid' } });
    apiMock.post.mockResolvedValueOnce({ data: { id: 30, status: 'paid' } });
    apiMock.post.mockResolvedValueOnce({ data: { receipt_number: 'RCT-30' } });
    apiMock.post.mockResolvedValueOnce({ data: { checkout_url: 'https://checkout.stripe.test/session' } });
    apiMock.post.mockResolvedValueOnce({ data: { id: 31, status: 'paid' } });
    apiMock.delete.mockResolvedValueOnce({});

    await expect(getPatientInvoices(1)).resolves.toEqual([{ id: 20, status: 'sent' }]);
    await expect(createInvoice(1, { amount: 99 })).resolves.toEqual({ id: 21, status: 'sent' });
    await expect(updateInvoice(21, { status: 'paid' })).resolves.toEqual({ id: 21, status: 'paid' });
    await expect(createPayment({ invoice_id: 21 })).resolves.toEqual({ id: 30, status: 'paid' });
    await expect(getPaymentReceipt(30)).resolves.toEqual({ receipt_number: 'RCT-30' });
    await expect(createStripeCheckout(21)).resolves.toEqual({ checkout_url: 'https://checkout.stripe.test/session' });
    await expect(confirmStripeCheckout('cs_test_123')).resolves.toEqual({ id: 31, status: 'paid' });
    await expect(deleteInvoice(21)).resolves.toBeUndefined();

    expect(apiMock.get).toHaveBeenCalledWith('/patients/1/invoices');
    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/patients/1/invoices', { amount: 99 });
    expect(apiMock.put).toHaveBeenCalledWith('/invoices/21', { status: 'paid' });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/payments', { invoice_id: 21 });
    expect(apiMock.post).toHaveBeenNthCalledWith(3, '/payments/30/receipt');
    expect(apiMock.post).toHaveBeenNthCalledWith(4, '/payments/stripe-checkout', { invoice_id: 21 });
    expect(apiMock.post).toHaveBeenNthCalledWith(5, '/payments/stripe-confirm', { session_id: 'cs_test_123' });
    expect(apiMock.delete).toHaveBeenCalledWith('/invoices/21');
  });

  it('calls analytics endpoints', async () => {
    const { getAppointmentStats, getDashboard, getPatientStats, getRevenue } = await import('./api');
    apiMock.get.mockResolvedValueOnce({ data: { patients: 4 } });
    apiMock.get.mockResolvedValueOnce({ data: [{ status: 'active', total: 4 }] });
    apiMock.get.mockResolvedValueOnce({ data: [{ month: '2026-05', total: '120.00' }] });
    apiMock.get.mockResolvedValueOnce({ data: [{ status: 'scheduled', total: 3 }] });

    await expect(getDashboard()).resolves.toEqual({ patients: 4 });
    await expect(getPatientStats()).resolves.toEqual([{ status: 'active', total: 4 }]);
    await expect(getRevenue()).resolves.toEqual([{ month: '2026-05', total: '120.00' }]);
    await expect(getAppointmentStats()).resolves.toEqual([{ status: 'scheduled', total: 3 }]);

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/analytics/dashboard');
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/analytics/patients');
    expect(apiMock.get).toHaveBeenNthCalledWith(3, '/analytics/revenue');
    expect(apiMock.get).toHaveBeenNthCalledWith(4, '/analytics/appointments');
  });

  it('calls admin user management endpoints', async () => {
    const { createUser, deleteUser, getUsers, updateUser } = await import('./api');
    apiMock.get.mockResolvedValueOnce({ data: { data: [{ id: 7, email: 'doctor@healthcrm.test' }] } });
    apiMock.post.mockResolvedValueOnce({ data: { id: 8 } });
    apiMock.put.mockResolvedValueOnce({ data: { id: 8, name: 'Updated' } });
    apiMock.delete.mockResolvedValueOnce({});

    await expect(getUsers()).resolves.toHaveLength(1);
    await expect(createUser({ name: 'Doctor' })).resolves.toEqual({ id: 8 });
    await expect(updateUser(8, { name: 'Updated' })).resolves.toEqual({ id: 8, name: 'Updated' });
    await expect(deleteUser(8)).resolves.toBeUndefined();

    expect(apiMock.get).toHaveBeenCalledWith('/users?per_page=20');
    expect(apiMock.post).toHaveBeenCalledWith('/users', { name: 'Doctor' });
    expect(apiMock.put).toHaveBeenCalledWith('/users/8', { name: 'Updated' });
    expect(apiMock.delete).toHaveBeenCalledWith('/users/8');
  });
});
