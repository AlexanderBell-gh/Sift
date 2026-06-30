import { useState, useCallback, useEffect } from 'react';
import { Search, Loader2, ShoppingBag } from 'lucide-react';
import type { SearchResult } from '../types';
import { searchProducts, addToWatchlist, removeFromWatchlist, getPinnedIds } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import SearchResultCard from './SearchResultCard';
import NavHeader from './NavHeader';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

export default function SearchPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [pinned, setPinned] = useState<Map<string, string>>(new Map());
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (!token) return;
    getPinnedIds(token).then(items => {
      setPinned(new Map(items.map(i => [i.product_id, i.id])));
    }).catch(() => {});
  }, [token]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchProducts(q);
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  async function handlePin(result: SearchResult) {
    if (!token) return;
    try {
      if (pinned.has(result.id)) {
        const wlId = pinned.get(result.id)!;
        await removeFromWatchlist(token, wlId);
        setPinned(prev => { const next = new Map(prev); next.delete(result.id); return next; });
        showToast('Removed from watchlist', 'info');
      } else {
        const item = await addToWatchlist(token, result);
        setPinned(prev => { const next = new Map(prev); next.set(item.product_id, item.id); return next; });
        showToast('Pinned to watchlist', 'success');
      }
    } catch {
      showToast('Failed to update watchlist', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A]">
      <NavHeader />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <p className="text-zinc-500 dark:text-gray-400">Compare prices across UK supermarkets</p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products (e.g., Medjool dates, almond milk)"
              className="w-full pl-12 pr-24 py-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent backdrop-blur-sm transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500               disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-zinc-500 dark:text-gray-400">Searching supermarkets...</p>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="w-16 h-16 text-zinc-300 dark:text-gray-600 mb-4" />
            <p className="text-zinc-600 dark:text-gray-400 text-lg">No products found</p>
            <p className="text-zinc-400 dark:text-gray-500 text-sm mt-1">Try a different search term</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result) => (
              <SearchResultCard
                key={result.id}
                result={result}
                authenticated={!!token}
                pinned={pinned.has(result.id)}
                onPin={() => handlePin(result)}
              />
            ))}
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="w-16 h-16 text-zinc-300 dark:text-gray-600 mb-4" />
            <p className="text-zinc-600 dark:text-gray-400 text-lg">Start comparing prices</p>
            <p className="text-zinc-400 dark:text-gray-500 text-sm mt-1">Search for any product to see prices from 7 UK supermarkets</p>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
