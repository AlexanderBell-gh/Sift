import { useState, useEffect, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist } from '../lib/api';
import { STORES } from '../lib/stores';
import { formatDate, isOfferExpired, getLoyaltyLabel, getLoyaltyClass, cleanDealText } from '../lib/utils';
import type { WatchlistItem } from '../types';
import NavHeader from './NavHeader';
import WatchlistFilters from './WatchlistFilters';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';


const ALL_STORES = STORES.map(s => s.name);
const ALL_CATEGORIES = ['Chilled', 'Snacks', 'Beverages', 'Produce', 'Frozen', 'Bakery', 'Food Cupboard'];

export default function WatchlistPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  const [selectedStores, setSelectedStores] = useState<string[]>(ALL_STORES);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORIES);
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
    if (selectedCategories.length < ALL_CATEGORIES.length) {
      result = result.filter(i => i.category && selectedCategories.includes(i.category));
    }

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
  }, [items, selectedStores, selectedCategories, sortBy]);

  const products = useMemo(() => {
    const map = new Map<string, WatchlistItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.product_id) ?? [];
      arr.push(item);
      map.set(item.product_id, arr);
    }
    return Array.from(map.values());
  }, [filtered]);

  const isTrial = user?.isTrial === true;
  const watchlistLimit = 5;
  const usedCount = useMemo(() => new Set(items.map(i => i.product_id)).size, [items]);
  const trialLimitReached = isTrial && usedCount >= watchlistLimit;

  async function handleRemoveProduct(productId: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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

      <WatchlistFilters
        selectedStores={selectedStores}
        onStoresChange={setSelectedStores}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <section className="pt-12 pb-8">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 className="page-title" style={{ fontFamily: 'var(--font-primary)', fontSize: '40px', fontWeight: '700' }}>Your Watchlist</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>All your offers in one place</p>
          </div>
        </div>
      </section>

      <div className="container">
        {!loading && isTrial && (
          <div className="trial-limit-banner">
            <div className="trial-limit-text">
              <span className="trial-limit-title">Trial watchlist</span>
              <span className="trial-limit-sub">
                {trialLimitReached
                  ? 'Limit reached — trial users can pin up to 5 items at a time, register to remove this limit'
                  : `${usedCount} of ${watchlistLimit} items pinned`}
              </span>
            </div>
            <div className="trial-limit-bar" title={`${usedCount} of ${watchlistLimit} used`}>
              <div className="trial-limit-fill" style={{ width: `${Math.min(100, (usedCount / watchlistLimit) * 100)}%` }} />
            </div>
          </div>
        )}

        {loading && (
          <div className="products-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="product-card animate-pulse">
                <div className="product-card-top">
                  <div className="product-card-logo">
                    <div className="skeleton w-8 h-8 rounded-full" />
                  </div>
                </div>
                <div className="product-card-bottom">
                  <div className="skeleton h-3 w-20 rounded" />
                  <div className="skeleton h-4 w-full rounded mt-1" />
                  <div className="skeleton h-6 w-16 rounded mt-2" />
                  <div className="skeleton h-3 w-24 rounded mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="empty-state-box" style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)', color: 'var(--muted)' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>Your Watchlist is empty</p>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>Find and pin groceries from the search tab.</p>
            <button
              onClick={() => navigate('/search')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
            >
              <Search style={{ width: '16px', height: '16px' }} />
              Search Products
            </button>
          </div>
        )}

        {!loading && items.length > 0 && filtered.length === 0 && (
          <div className="empty-state-box" style={{ textAlign: 'center', padding: '60px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)', color: 'var(--muted)' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>No items match filters</p>
            <p style={{ fontSize: '14px' }}>Try selecting more stores</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="products-grid">
            {products.map(group => {
              const product = group[0];
              const lastUpdated = Math.max(...group.map(i => i.updated_at));
              const sorted = [...group].sort((a, b) => (a.prices.loyalty ?? a.prices.normal ?? Infinity) - (b.prices.loyalty ?? b.prices.normal ?? Infinity));
              const best = sorted[0];

              const cardContent = (
                <>
                  <div className="product-card-top">
                    <button
                      onClick={(e) => handleRemoveProduct(product.product_id, e)}
                      className="product-card-remove"
                      title="Remove"
                    >
                      ✕
                    </button>
                    {best.image_url ? (
                      <img src={best.image_url} alt={product.product_name} className="product-card-image" />
                    ) : (
                      <div className="product-card-logo">
                        {best.store_logo ? (
                          <img src={best.store_logo} alt={best.store} className="product-card-logo-img" />
                        ) : (
                          <span className="product-card-logo-text">{best.store.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="product-card-bottom">
                    <span className="store-card">
                      {best.store_logo && (
                        <img src={best.store_logo} alt={best.store} className="store-logo" />
                      )}
                      {best.store}
                    </span>
                    <h3>{product.product_name}</h3>
                    {best.category && (
                      <span className={`product-card-category category-${best.category.toLowerCase().replace(/\s+/g, '-')}`}>{best.category}</span>
                    )}
                    {isOfferExpired(best.offer_expires_at) ? (
                      <>
                        <div className="product-card-price">
                          <span className="expired-price">
                            £{(best.prices.normal ?? best.prices.loyalty ?? 0).toFixed(2)}
                          </span>
                          {best.prices.normal !== null && best.prices.loyalty !== null && (
                            <span className="was-price">was £{best.prices.loyalty.toFixed(2)}</span>
                          )}
                        </div>
                        {(best.offer_deal || best.prices.loyalty !== null) && (
                          <span className={`product-card-loyalty ${best.offer_deal ? 'expired' : ''}`}>
                            <span className={`product-card-loyalty-label ${getLoyaltyClass(best.store)}`}>{best.offer_deal ? cleanDealText(best.offer_deal) : getLoyaltyLabel(best.store)}</span>
                          </span>
                        )}
                        <span className="product-card-offer expired">Offer expired</span>
                      </>
                    ) : (
                      <>
                        <div className="product-card-price">
                          {best.offer_deal ? (
                            <span className="offer-price">£{(best.prices.normal ?? 0).toFixed(2)}</span>
                          ) : (
                            <>
                              {best.prices.normal !== null && best.prices.loyalty !== null && (
                                <span className="full-price">£{best.prices.normal.toFixed(2)}</span>
                              )}
                              <span className="offer-price">
                                £{(best.prices.loyalty ?? best.prices.normal ?? 0).toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                        {(best.offer_deal || best.prices.loyalty !== null) && (
                          <span className="product-card-loyalty">
                            <span className={`product-card-loyalty-label ${getLoyaltyClass(best.store)}`}>{best.offer_deal ? cleanDealText(best.offer_deal) : getLoyaltyLabel(best.store)}</span>
                          </span>
                        )}
                        {best.offer_expires_at && (
                          <span className="product-card-offer">
                            Offer ends {formatDate(best.offer_expires_at)}
                          </span>
                        )}
                      </>
                    )}
                    <p>Updated {formatTimeAgo(lastUpdated)}</p>
                  </div>
                </>
              );

              return best.product_url ? (
                <a
                  key={product.product_id}
                  href={best.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="product-card"
                >
                  {cardContent}
                </a>
              ) : (
                <div key={product.product_id} className="product-card">
                  {cardContent}
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
