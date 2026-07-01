const STORAGE_KEY = 'sift_search_history';
const MAX_ITEMS = 10;

export function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addSearch(query: string): string[] {
  const history = getHistory().filter(h => h !== query);
  history.unshift(query);
  const trimmed = history.slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
