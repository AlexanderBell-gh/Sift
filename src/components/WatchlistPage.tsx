import { useState, useEffect, useMemo } from 'react';
import { BookmarkCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist, refreshWatchlistItem } from '../lib/api';
import type { WatchlistItem } from '../types';
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

  async function handleRefreshAll() {
    if (!token) return;
    for (const item of items) {
      if (!refreshing.has(item.id)) {
        handleRefresh(item.id);
      }
    }
  }

  function formatTimeAgo(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  function getStoreShortName(store: string) {
    const map: Record<string, string> = {
      "Sainsbury's": 'Sains',
      'Morrisons': 'Morr',
      'M&S': 'M&S',
    };
    return map[store] || store;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <NavHeader />

      <section className="pt-12 pb-8 text-center">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: '700' }}>Your Watchlist</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Real-time tracking for items in your comparison rotation</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={handleRefreshAll}
              disabled={refreshing.size > 0}
              className="search-button"
              style={{ margin: 0, padding: '12px 24px' }}
            >
              + Track Item
            </button>
          )}
        </div>
      </section>

      <div className="container" style={{ paddingBottom: '100px' }}>
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
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="watchlist-tile animate-pulse">
                <div className="tile-product-info">
                  <div className="skeleton h-6 w-48 rounded" />
                  <div className="skeleton h-4 w-20 rounded" />
                </div>
                <div className="tile-comparison-strip">
                  <div className="skeleton h-16 w-32 rounded-xl" />
                  <div className="skeleton h-16 w-20 rounded-lg" />
                  <div className="skeleton h-16 w-20 rounded-lg" />
                </div>
                <div className="tile-meta">
                  <div className="skeleton h-5 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <BookmarkCheck className="w-16 h-16 text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">No pinned products</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">Compare prices across 7 UK supermarkets</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-accent text-white font-medium rounded-xl hover:bg-accent-light transition-colors"
            >
              Search Products
            </button>
          </div>
        )}

        {!loading && items.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">No items match filters</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">Try selecting more stores</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="watchlist-container">
            {filtered.map((item) => {
              const bestPrice = item.prices.normal ?? item.prices.loyalty ?? 0;
              const otherStores = items
                .filter(i => i.product_id === item.product_id && i.id !== item.id)
                .slice(0, 3);

              return (
                <div key={item.id} className="watchlist-tile">
                  <div className="tile-product-info">
                    <span className="tile-product-name">{item.product_name}</span>
                    <span className="tile-last-updated">Updated {formatTimeAgo(item.updated_at)}</span>
                  </div>

                  <div className="tile-comparison-strip">
                    <div className="tile-best-price">
                      <span className="best-price-label">Best</span>
                      <span className="best-price-value">£{bestPrice.toFixed(2)}</span>
                      <span className="best-price-store">{item.store}</span>
                    </div>
                    {otherStores.map(other => (
                      <div key={other.id} className="comparison-chip">
                        <span className="chip-store">{getStoreShortName(other.store)}</span>
                        <span className="chip-price">£{(other.prices.normal ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="tile-meta">
                    <button
                      onClick={() => handleRefresh(item.id)}
                      disabled={refreshing.has(item.id)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-accent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                      title="Refresh price"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing.has(item.id) ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
