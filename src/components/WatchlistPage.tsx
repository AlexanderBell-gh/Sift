import { useState, useEffect, useMemo } from 'react';
import { BookmarkCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist } from '../lib/api';
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

  useEffect(() => {
    if (!token) {
      navigate('/');
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

  const products = useMemo(() => {
    const map = new Map<string, WatchlistItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.product_id) ?? [];
      arr.push(item);
      map.set(item.product_id, arr);
    }
    return Array.from(map.values());
  }, [filtered]);

  async function handleRemoveProduct(productId: string) {
    if (!token) return;
    const group = items.filter(i => i.product_id === productId);
    try {
      await Promise.all(group.map(i => removeFromWatchlist(token, i.id)));
      setItems(prev => prev.filter(i => i.product_id !== productId));
      showToast('Removed from watchlist', 'info');
    } catch {
      showToast('Failed to remove item', 'error');
    }
  }

  function getLoyaltyLabel(store: string): string {
    const labels: Record<string, string> = {
      Tesco: 'Clubcard price',
      "Sainsbury's": 'Nectar price',
      Morrisons: 'More card price',
      'M&S': 'Sparks price',
      Lidl: 'Lidl Plus price',
      ASDA: 'ASDA price',
      Aldi: 'Aldi price',
    };
    return labels[store] ?? 'Offer price';
  }

  function formatTimeAgo(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <NavHeader />

      <section className="pt-12 pb-8 text-center">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: '40px', fontWeight: '700' }}>Your Watchlist</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Real-time tracking for items in your comparison rotation</p>
          </div>
        </div>
      </section>

      <div className="container">
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
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="product-row animate-pulse">
                <div className="product-info">
                  <div className="skeleton h-5 w-40 rounded" />
                  <div className="skeleton h-3 w-28 rounded mt-2" />
                </div>
                <div className="lowest-core">
                  <div className="skeleton h-3 w-20 rounded" />
                  <div className="flex items-center gap-2">
                    <div className="skeleton h-7 w-16 rounded" />
                    <div className="skeleton h-5 w-12 rounded" />
                  </div>
                </div>
                <div className="other-stores">
                  <div className="skeleton h-12 w-16 rounded-lg" />
                  <div className="skeleton h-12 w-16 rounded-lg" />
                  <div className="skeleton h-12 w-16 rounded-lg" />
                </div>
                <div className="skeleton h-8 w-16 rounded-lg" />
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

        {!loading && products.length > 0 && (
          <div className="products-grid">
            {products.map(group => {
              const product = group[0];
              const lastUpdated = Math.max(...group.map(i => i.updated_at));
              const sorted = [...group].sort((a, b) => (a.prices.loyalty ?? a.prices.normal ?? Infinity) - (b.prices.loyalty ?? b.prices.normal ?? Infinity));
              const best = sorted[0];

              return (
                <div key={product.product_id} className="product-row">
                  <div className="product-info">
                    <h3>{product.product_name}</h3>
                    <p>UPDATED {formatTimeAgo(lastUpdated)}</p>
                  </div>

                  <div className="lowest-core">
                    <span className="lowest-core-label">{getLoyaltyLabel(best.store)}</span>
                    <div className="lowest-core-price">
                      {best.prices.normal !== null && best.prices.loyalty !== null && (
                        <span className="lowest-core-old">£{best.prices.normal.toFixed(2)}</span>
                      )}
                      <span className="lowest-core-value">
                        £{(best.prices.loyalty ?? best.prices.normal ?? 0).toFixed(2)}
                      </span>
                      <span className="lowest-core-store">
                        {best.store_logo && (
                          <img
                            src={best.store_logo}
                            alt={best.store}
                            className="store-logo"
                          />
                        )}
                        {best.store}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveProduct(product.product_id)}
                    className="remove-link"
                  >
                    Remove
                  </button>
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
