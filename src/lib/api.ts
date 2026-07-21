import Fuse from 'fuse.js';
import ukProducts from '../data/uk-products.json';
import type { SearchResult, WatchlistItem, Alert, AdminStats, AdminUser, AdminUserDetail, AdminAnalytics, AuditLog, TrialUser, User } from '../types';

const API_BASE_URL = 'https://siftapi.blackmesa.workers.dev';

export async function updatePassword(token: string, currentPassword: string, newPassword: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse<User>(response);
}

export async function deleteAccount(token: string, password?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: password ? JSON.stringify({ password }) : undefined,
  });
  await handleResponse(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export async function searchProducts(query: string, token?: string): Promise<{
  results: SearchResult[];
  cached?: boolean;
}> {
  const params = new URLSearchParams({ q: query });
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}/api/search?${params}`, { headers });
  return handleResponse(response);
}

export interface AutocompleteProduct {
  name: string;
}

const fuse = new Fuse(ukProducts, {
  keys: ['name'],
  threshold: 0.4,
  minMatchCharLength: 1,
  shouldSort: true,
});

export function searchAutocomplete(query: string): AutocompleteProduct[] {
  if (query.length < 2) return [];
  return fuse.search(query.slice(0, 50)).slice(0, 8).map(r => ({ name: r.item.name }));
}

export async function getPinnedIds(token: string): Promise<{ id: string; product_id: string }[]> {
  const response = await fetch(`${API_BASE_URL}/api/watchlist/ids`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function getWatchlist(token: string): Promise<WatchlistItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/watchlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function addToWatchlist(token: string, result: SearchResult): Promise<WatchlistItem> {
  const response = await fetch(`${API_BASE_URL}/api/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ result }),
  });
  return handleResponse(response);
}

export async function removeFromWatchlist(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/watchlist/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function refreshWatchlistItem(
  token: string,
  id: string
): Promise<{ item: WatchlistItem; priceChanged: boolean; previousPrices: { normal: number | null; loyalty: number | null } | null }> {
  const response = await fetch(`${API_BASE_URL}/api/watchlist/${id}/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function getAlerts(token: string): Promise<{ alerts: Alert[]; unreadCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function markAlertRead(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/${id}/read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

// ===== ADMIN =====

export async function getAdminStats(token: string): Promise<AdminStats> {
  const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function getAdminUsers(
  token: string,
  params: { page?: number; limit?: number; search?: string; filter?: string } = {}
): Promise<{ users: AdminUser[]; total: number; page: number; limit: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.search) searchParams.set('search', params.search);
  if (params.filter) searchParams.set('filter', params.filter);
  const response = await fetch(`${API_BASE_URL}/api/admin/users?${searchParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function getAdminUserDetail(token: string, userId: string): Promise<AdminUserDetail> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function deleteAdminUser(token: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function setAdminUserRole(token: string, userId: string, role: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  });
  return handleResponse(response);
}

export async function getAdminAudit(
  token: string,
  params: { page?: number; limit?: number; action?: string; search?: string } = {}
): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.action) searchParams.set('action', params.action);
  if (params.search) searchParams.set('search', params.search);
  const response = await fetch(`${API_BASE_URL}/api/admin/audit?${searchParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function getAdminAnalytics(token: string): Promise<AdminAnalytics> {
  const response = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function getAdminTrials(
  token: string,
  params: { page?: number; limit?: number; status?: string; search?: string } = {}
): Promise<{ trials: TrialUser[]; total: number; page: number; limit: number; totalPages: number }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);
  const response = await fetch(`${API_BASE_URL}/api/admin/trials?${searchParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}

export async function cleanupExpiredTrials(token: string): Promise<{ deletedCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/trials/cleanup`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
}
