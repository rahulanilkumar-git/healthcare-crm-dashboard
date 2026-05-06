import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = {
  interceptors: {
    request: {
      use: vi.fn(),
    },
  },
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

  it('stores the JWT token after login', async () => {
    const { login } = await import('./api');
    apiMock.post.mockResolvedValueOnce({ data: { token: 'jwt-token', user: { name: 'Rahul Admin' } } });

    await expect(login('admin@healthcrm.test', 'password123')).resolves.toEqual({ name: 'Rahul Admin' });

    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@healthcrm.test',
      password: 'password123',
    });
    expect(localStorage.setItem).toHaveBeenCalledWith('crm_token', 'jwt-token');
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

  it('calls invoice edit, delete, and receipt endpoints', async () => {
    const { deleteInvoice, getPaymentReceipt, updateInvoice } = await import('./api');
    apiMock.put.mockResolvedValueOnce({ data: { id: 3, status: 'paid' } });
    apiMock.post.mockResolvedValueOnce({ data: { receipt_number: 'RCT-9' } });
    apiMock.delete.mockResolvedValueOnce({});

    await expect(updateInvoice(3, { status: 'paid' })).resolves.toEqual({ id: 3, status: 'paid' });
    await expect(getPaymentReceipt(9)).resolves.toEqual({ receipt_number: 'RCT-9' });
    await expect(deleteInvoice(3)).resolves.toBeUndefined();

    expect(apiMock.put).toHaveBeenCalledWith('/invoices/3', { status: 'paid' });
    expect(apiMock.post).toHaveBeenCalledWith('/payments/9/receipt');
    expect(apiMock.delete).toHaveBeenCalledWith('/invoices/3');
  });
});
