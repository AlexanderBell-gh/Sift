import type { SearchResult } from '../types';

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
