import type { Product, Category, AuthResponse, AdminUser, AdminUserDetail, AdminTrial, AuditLog, SearchResult } from '../types';

const API_BASE_URL = 'https://pricetrackr-api.inbox-alexbell.workers.dev';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'pricetrackr_token',
  AUTH_USER: 'pricetrackr_user',
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export const api = {
  async getProducts(): Promise<Product[]> {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getProduct(id: string): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async createProduct(product: { name: string; url?: string; imageUrl?: string; category: string; price: number; store?: string; notes?: string }): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(product),
    });
    return handleResponse(response);
  },

  async updateProduct(id: string, updates: Partial<Product> & { price?: number; store?: string }): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  async deleteProduct(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete product' }));
      throw new Error(error.error || 'Failed to delete product');
    }
  },

  async addPrice(id: string, priceData: { price: number; store?: string; date?: string }): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${id}/prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(priceData),
    });
    return handleResponse(response);
  },

  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(category),
    });
    return handleResponse(response);
  },

  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete category' }));
      throw new Error(error.error || 'Failed to delete category');
    }
  },

  async signUp(credentials: { email: string; username: string; password: string }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await handleResponse<AuthResponse>(response);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
    return data;
  },

  async signIn(credentials: { username: string; password: string }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await handleResponse<AuthResponse>(response);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
    return data;
  },

  async createTrial(username?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await handleResponse<AuthResponse>(response);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(data.user));
    return data;
  },

  async getCurrentUser(): Promise<AuthResponse['user'] | null> {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!token || !userStr) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return null;
      const user = await response.json();
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to change password' }));
      throw new Error(error.error || 'Failed to change password');
    }
  },

  async changeEmail(newEmail: string, password: string): Promise<AuthResponse['user']> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ newEmail, password }),
    });
    const user = await handleResponse<AuthResponse['user']>(response);
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    return user;
  },

  async deleteAccount(password?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: password ? JSON.stringify({ password }) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete account' }));
      throw new Error(error.error || 'Failed to delete account');
    }
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  },

  signOut(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  },

  getStoredUser(): AuthResponse['user'] | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async getAdminStats(): Promise<{ totalUsers: number; regularUsers: number; trialUsers: number; totalProducts: number; totalPrices: number }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAdminUsers(page = 1, limit = 20, search?: string, filter: 'users' | 'trials' | 'all' = 'users'): Promise<{ users: AdminUser[]; total: number; page: number; limit: number; totalPages: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), filter });
    if (search) params.set('search', search);
    const response = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAdminUser(id: string): Promise<AdminUserDetail> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async deleteAdminUser(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete user' }));
      throw new Error(error.error || 'Failed to delete user');
    }
  },

  async updateUserRole(id: string, role: 'admin' | 'user'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update role' }));
      throw new Error(error.error || 'Failed to update role');
    }
  },

  async getAdminAnalytics(): Promise<{ categoryDistribution: Record<string, number>; storeDistribution: Record<string, number>; totalProducts: number; totalPriceEntries: number; userCount: number; regularUsers: number; trialUsers: number }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAdminTrials(page = 1, limit = 20, status?: 'active' | 'expired', search?: string): Promise<{ trials: AdminTrial[]; total: number; page: number; limit: number; totalPages: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    const response = await fetch(`${API_BASE_URL}/api/admin/trials?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async cleanupExpiredTrials(): Promise<{ deletedCount: number }> {
    const response = await fetch(`${API_BASE_URL}/api/admin/trials/cleanup`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAuditLogs(page = 1, limit = 20, action?: string, search?: string, startDate?: string, endDate?: string): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number; totalPages: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (action) params.set('action', action);
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const response = await fetch(`${API_BASE_URL}/api/admin/audit?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async searchImages(query: string): Promise<{ images: { title: string; imageUrl: string; source: string; sourceUrl: string }[] }> {
    const response = await fetch(`${API_BASE_URL}/api/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ q: query }),
    });
    return handleResponse(response);
  },

  async searchProducts(query: string): Promise<{ results: SearchResult[] }> {
    const response = await fetch(`${API_BASE_URL}/api/search/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ q: query }),
    });
    return handleResponse(response);
  },
};
