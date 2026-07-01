import { useState, useEffect, useMemo } from 'react';
import { BookmarkCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist, refreshWatchlistItem } from '../lib/api';
import type { WatchlistItem } from '../types';
import SearchResultCard from './SearchResultCard';
import NavHeader from './NavHeader';
import FilterDropdown from './FilterDropdown';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

const ALL_STORES = ['Tesco', "Sainsbury's", 'ASDA', 'Morrisons', 'M&S', 'Aldi', 'Lidl'];

export default function WatchlistPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  const [selectedStores, setSelectedStores] = useState<string[]>(ALL_STORES);
  const [sortBy, setSortBy] = useState('relevance');
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    getWatchlist(token)
      .then(setItems)
      .catch(() => showToast('Failed to load watchlist', 'error'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const filtered = useMemo(() => {
    let result = items.filter(i => selectedStores.includes(i.store));

    switch (sortBy) {
      case 'price_asc':
        result = [...result].sort((a, b) => (a.prices.normal ?? Infinity) - (b.prices.normal ?? Infinity));
        break;
      case 'price_desc':
        result = [...result].sort((a, b) => (b.prices.normal ?? -1) - (a.prices.normal ?? -1));
        break;
      case 'store_asc':
        result = [...result].sort((a, b) => a.store.localeCompare(b.store));
        break;
    }

    return result;
  }, [items, selectedStores, sortBy]);

  async function handleRemove(id: string) {
    if (!token) return;
    try {
      await removeFromWatchlist(token, id);
      setItems(prev => prev.filter(i => i.id !== id));
      showToast('Removed from watchlist', 'info');
    } catch {
      showToast('Failed to remove item', 'error');
    }
  }

  async function handleRefresh(id: string) {
    if (!token) return;
    setRefreshing(prev => new Set(prev).add(id));
    try {
      const result = await refreshWatchlistItem(token, id);
      setItems(prev => prev.map(i => i.id === id ? result.item : i));
      if (result.priceChanged && result.previousPrices) {
        const old = result.previousPrices.normal;
        const curr = result.item.prices.normal;
        if (old !== null && curr !== null) {
          showToast(`Price updated: £${old.toFixed(2)} → £${curr.toFixed(2)}`, 'success');
        } else {
          showToast('Price updated', 'success');
        }
      } else {
        showToast('Price checked — no change', 'info');
      }
    } catch {
      showToast('Failed to refresh price', 'error');
    } finally {
      setRefreshing(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function formatTimeAgo(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A]">
      <NavHeader title="Watchlist" showBack />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter toolbar */}
        {!loading && items.length > 0 && (
          <div className="mb-6">
            <FilterDropdown
              selectedStores={selectedStores}
              onStoresChange={setSelectedStores}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
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

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <BookmarkCheck className="w-16 h-16 text-zinc-300 dark:text-gray-600 mb-4" />
            <p className="text-zinc-600 dark:text-gray-400 text-lg">No pinned products</p>
            <p className="text-zinc-400 dark:text-gray-500 text-sm mt-1">Compare prices across 7 UK supermarkets</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-accent text-black font-medium rounded-xl hover:bg-accent-light transition-colors"
            >
              Search Products
            </button>
          </div>
        )}

        {!loading && items.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-zinc-600 dark:text-gray-400 text-lg">No items match filters</p>
            <p className="text-zinc-400 dark:text-gray-500 text-sm mt-1">Try selecting more stores</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="relative">
                <SearchResultCard
                  result={{
                    id: item.product_id,
                    name: item.product_name,
                    store: item.store,
                    store_logo: item.store_logo,
                    image_url: item.image_url,
                    unit: item.unit,
                    prices: item.prices,
                    loyalty_type: item.loyalty_type,
                    offer_expires_at: item.offer_expires_at,
                    product_url: item.product_url,
                    is_on_offer: item.is_on_offer,
                  }}
                  showRemove
                  onRemove={() => handleRemove(item.id)}
                />
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <button
                    onClick={() => handleRefresh(item.id)}
                    disabled={refreshing.has(item.id)}
                    className="p-2 rounded-lg bg-black/30 dark:bg-black/30 text-white/70 hover:text-white hover:bg-black/50 backdrop-blur-sm transition-colors disabled:opacity-50"
                    title="Refresh price"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing.has(item.id) ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="px-4 pb-1">
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Updated {formatTimeAgo(item.updated_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
