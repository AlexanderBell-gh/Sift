import type { SearchResult, WatchlistItem } from '../types';

const API_BASE_URL = 'https://pricetrackr-api.inbox-alexbell.workers.dev';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export async function searchProducts(query: string): Promise<{ results: SearchResult[]; cached?: boolean }> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_BASE_URL}/api/search?${params}`);
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
