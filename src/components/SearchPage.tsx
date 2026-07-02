import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ShoppingBag } from 'lucide-react';
import type { SearchResult } from '../types';
import { searchProducts, addToWatchlist, removeFromWatchlist, getPinnedIds, getSearchSuggestions } from '../lib/api';
import { getHistory, addSearch, clearHistory } from '../lib/searchHistory';
import { useAuth } from '../contexts/AuthContext';
import SearchResultCard from './SearchResultCard';
import NavHeader from './NavHeader';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

export default function SearchPage() {
  const navigate = useNavigate();
  const { token, user, startTrial } = useAuth();
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [pinned, setPinned] = useState<Map<string, string>>(new Map());
  const { toast, showToast, hideToast } = useToast();

  const [history, setHistory] = useState<string[]>(() => getHistory());

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitReason, setLimitReason] = useState<'trial_expired' | 'search_limit' | null>(null);
  const [localSearchCount, setLocalSearchCount] = useState(user?.searchCount ?? 0);

  useEffect(() => {
    setLocalSearchCount(user?.searchCount ?? 0);
  }, [user?.searchCount]);

  const remainingSearches = user?.isTrial
    ? Math.max(0, 5 - localSearchCount)
    : null;

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    if (!token) return;
    getPinnedIds(token).then(items => {
      setPinned(new Map(items.map(i => [i.product_id, i.id])));
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const data = await getSearchSuggestions(query);
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery ?? queryRef.current).trim();
    if (!q) return;

    // Check trial limits before API call
    if (user?.isTrial) {
      if (user.trialExpiresAt && Date.now() > user.trialExpiresAt) {
        setLimitReason('trial_expired');
        setShowLimitModal(true);
        return;
      }
      if (remainingSearches !== null && remainingSearches <= 0) {
        setLimitReason('search_limit');
        setShowLimitModal(true);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setShowSuggestions(false);
    setShowHistory(false);

    try {
      const data = await searchProducts(q, token || undefined);
      if (data.blocked) {
        setLimitReason(data.reason || 'search_limit');
        setShowLimitModal(true);
        return;
      }
      setResults(data.results || []);
      setHistory(addSearch(q));
      setLocalSearchCount(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      showToast(err instanceof Error ? err.message : 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, user, remainingSearches]);

  function selectSuggestion(suggestion: string) {
    setQuery(suggestion);
    setShowSuggestions(false);
    setShowHistory(false);
    setSelectedIndex(-1);
    handleSearch(suggestion);
  }

  function selectHistory(item: string) {
    setQuery(item);
    setShowHistory(false);
    handleSearch(item);
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
    setShowHistory(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowHistory(false);
      setSelectedIndex(-1);
    }
  }

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
        {!token ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="w-16 h-16 text-zinc-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Compare prices across 7 UK supermarkets</h2>
            <p className="text-zinc-500 dark:text-gray-400 mb-6">Try free for 12 hours with 5 free searches</p>
            <Button onClick={startTrial}>Free trial</Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <p className="text-zinc-500 dark:text-gray-400">Find the best deals across UK supermarkets</p>
            </div>

            {user?.isTrial && remainingSearches !== null && (
              <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 mb-4">
                {remainingSearches} free {remainingSearches === 1 ? 'search' : 'searches'} remaining
              </p>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="max-w-2xl mx-auto mb-8">
              <div className="relative" ref={suggestionsRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    if (query.length < 2 && history.length > 0) {
                      setShowHistory(true);
                      setShowSuggestions(false);
                    } else if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for products..."
                  className="w-full pl-10 sm:pl-12 pr-16 sm:pr-24 py-3 sm:py-4 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent backdrop-blur-sm transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span className="sm:hidden"><Search className="w-5 h-5" /></span>
                      <span className="hidden sm:inline">Search</span>
                    </>
                  )}
                </button>

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                          index === selectedIndex
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <Search className="inline w-4 h-4 mr-2 opacity-50" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {showHistory && history.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-white/5">
                      <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Recent searches</span>
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {history.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => selectHistory(item)}
                        className="w-full px-4 py-3 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Search className="inline w-4 h-4 mr-2 opacity-50" />
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {error && (
              <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="product-card animate-pulse">
                    <div className="skeleton h-44 rounded-t-2xl" />
                    <div className="p-4 space-y-3">
                      <div className="skeleton h-3 w-16 rounded" />
                      <div className="skeleton h-4 w-3/4 rounded" />
                      <div className="skeleton h-3 w-12 rounded" />
                      <div className="skeleton h-6 w-20 rounded" />
                      <div className="skeleton h-3 w-24 rounded" />
                    </div>
                  </div>
                ))}
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
                <p className="text-zinc-400 dark:text-gray-500 text-sm mt-1 text-center">Search for any product to see prices from 7 UK supermarkets</p>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <Modal isOpen={showLimitModal} onClose={() => setShowLimitModal(false)} title="Free search limit reached">
        <p className="text-zinc-600 dark:text-gray-400 mb-6">
          {limitReason === 'trial_expired'
            ? 'Trial period ended, sign up to continue using.'
            : 'Sign up to have access to your watchlist and unlimited searches.'}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowLimitModal(false)}>Close</Button>
          <Button onClick={() => { setShowLimitModal(false); navigate('/auth'); }}>Sign up now</Button>
        </div>
      </Modal>
    </div>
  );
}
