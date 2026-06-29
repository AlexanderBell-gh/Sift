import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ShoppingBag, BookmarkCheck, LogOut } from 'lucide-react';
import type { SearchResult } from '../types';
import { searchProducts, addToWatchlist, removeFromWatchlist, getPinnedIds } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import SearchResultCard from './SearchResultCard';

export default function SearchPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  // productId -> watchlistId
  const [pinned, setPinned] = useState<Map<string, string>>(new Map());

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
      } else {
        const item = await addToWatchlist(token, result);
        setPinned(prev => { const next = new Map(prev); next.set(item.product_id, item.id); return next; });
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Nav */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold gradient-text">Sift</span>
          <div className="flex items-center gap-3">
            {token && (
              <button
                onClick={() => navigate('/watchlist')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <BookmarkCheck className="w-4 h-4" />
                Watchlist
              </button>
            )}
            {token ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">{user?.username}</span>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="px-3 py-1.5 rounded-lg text-sm bg-accent text-black font-medium hover:bg-accent-light transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-gray-400">Compare prices across UK supermarkets</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products (e.g., Medjool dates, almond milk)"
              className="w-full pl-12 pr-24 py-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent backdrop-blur-sm"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-400">Searching supermarkets...</p>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No products found</p>
            <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
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

        {/* Initial State */}
        {!hasSearched && !loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">Start comparing prices</p>
            <p className="text-gray-500 text-sm mt-1">Search for any product to see prices from 7 UK supermarkets</p>
          </div>
        )}
      </div>
    </div>
  );
}
