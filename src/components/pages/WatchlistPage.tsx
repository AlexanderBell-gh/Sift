import { useState, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist, addToShoppingList } from '../../lib/api';
import { STORES, storeLogoFor } from '../../lib/stores';
import { CATEGORIES } from '../../lib/categories';
import { formatDate, formatTimeAgo, isOfferExpired, getLoyaltyLabel, getLoyaltyClass } from '../../lib/utils';
import type { WatchlistItem } from '../../types';
import NavHeader from '../layout/NavHeader';
import WatchlistFilters from '../features/watchlist/WatchlistFilters';
import type { OfferStatus } from '../features/watchlist/WatchlistFilters';
import WatchlistSkeletonCard from '../features/watchlist/WatchlistSkeletonCard';
import { useExtensionInstalled } from '../../hooks/useExtensionInstalled';

const ALL_STORES = STORES.map(s => s.name);
const ALL_CATEGORIES = [...CATEGORIES];
const PAGE_SIZE = 12;

export default function WatchlistPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { installed } = useExtensionInstalled();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedStores, setSelectedStores] = useState<string[]>(ALL_STORES);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(ALL_CATEGORIES);
  const [sortBy, setSortBy] = useState('relevance');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    getWatchlist(token)
      .then(setItems)
      .catch(() => setError('Failed to load watchlist'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const filtered = useMemo(() => {
    let result = items.filter(i => selectedStores.includes(i.store));
    if (selectedCategories.length < ALL_CATEGORIES.length) {
      result = result.filter(i => i.category && selectedCategories.includes(i.category));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(i => i.product_name.toLowerCase().includes(q));
    }

    switch (sortBy) {
      case 'price_asc':
        result = [...result].sort((a, b) => (a.prices.normal ?? Infinity) - (b.prices.normal ?? Infinity));
        break;
      case 'price_desc':
        result = [...result].sort((a, b) => (b.prices.normal ?? -1) - (a.prices.normal ?? -1));
        break;
    }

    return result;
  }, [items, selectedStores, selectedCategories, sortBy, searchQuery]);

  const products = useMemo(() => {
    const map = new Map<string, WatchlistItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.product_id) ?? [];
      arr.push(item);
      map.set(item.product_id, arr);
    }
    return Array.from(map.values());
  }, [filtered]);

  function getBest(group: WatchlistItem[]): WatchlistItem {
    return [...group].sort((a, b) => (a.prices.loyalty ?? a.prices.normal ?? Infinity) - (b.prices.loyalty ?? b.prices.normal ?? Infinity))[0]!;
  }

  const { offerGroups, plainGroups, expiredProducts, allGroups } = useMemo(() => {
    const offers: WatchlistItem[][] = [];
    const plain: WatchlistItem[][] = [];
    const expired: WatchlistItem[][] = [];
    for (const group of products) {
      const best = getBest(group);
      if (isOfferExpired(best.offer_expires_at)) {
        expired.push(group);
      } else if (best.is_on_offer) {
        offers.push(group);
      } else {
        plain.push(group);
      }
    }
    return { offerGroups: offers, plainGroups: plain, expiredProducts: expired, allGroups: [...offers, ...plain] };
  }, [products]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<OfferStatus>('all');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  const currentProducts = view === 'all' ? allGroups : view === 'offers' ? offerGroups : view === 'plain' ? plainGroups : expiredProducts;
  const statusCounts: Record<OfferStatus, number> = {
    all: allGroups.length,
    offers: offerGroups.length,
    plain: plainGroups.length,
    expired: expiredProducts.length,
  };
  const hasMore = visibleCount < currentProducts.length;
  const visibleProducts = useMemo(() => currentProducts.slice(0, visibleCount), [currentProducts, visibleCount]);
  const moreCount = Math.min(PAGE_SIZE, currentProducts.length - visibleCount);

  function resetPaging() {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    pendingRef.current = false;
    setLoadingMore(false);
    setVisibleCount(PAGE_SIZE);
  }

  function handleFilterReset() {
    resetPaging();
    window.scrollTo(0, 0);
  }

  function handleStatusChange(next: OfferStatus) {
    if (next === view) return;
    setView(next);
    handleFilterReset();
  }

  function handleClearSearch() {
    setSearchQuery('');
    handleFilterReset();
  }

  const searchActive = searchQuery.trim().length > 0;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !pendingRef.current) {
          pendingRef.current = true;
          setLoadingMore(true);
          timerRef.current = window.setTimeout(() => {
            setVisibleCount((c) => Math.min(c + PAGE_SIZE, currentProducts.length));
            setLoadingMore(false);
            pendingRef.current = false;
          }, 1000);
        }
      },
      { rootMargin: '600px' }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timerRef.current);
    };
  }, [hasMore, currentProducts.length]);

  // Deep-link from alerts (?item=<watchlist_id>): switch to owning tab,
  // scroll card into view, flash highlight. Param cleared.
  // State updates deferred to timers: no sync setState in effect body.
  useEffect(() => {
    if (loading) return;
    const targetId = searchParams.get('item');
    if (!targetId) return;
    let scrollTimer: number | undefined;
    let clearTimer: number | undefined;
    const applyTimer = window.setTimeout(() => {
      const target = items.find(i => i.id === targetId);
      if (!target) {
        setSearchParams({}, { replace: true });
        return;
      }
      // Card renders per product group under cheapest row id: resolve group best.
      const group = items.filter(i => i.product_id === target.product_id);
      const best = [...group].sort(
        (a, b) => (a.prices.loyalty ?? a.prices.normal ?? Infinity) - (b.prices.loyalty ?? b.prices.normal ?? Infinity)
      )[0];
      if (!best) {
        setSearchParams({}, { replace: true });
        return;
      }
      if (isOfferExpired(target.offer_expires_at)) {
        setView('expired');
        const idx = expiredProducts.findIndex(g => g[0]?.product_id === target.product_id);
        if (idx >= visibleCount) setVisibleCount(idx + 1);
      } else if (target.is_on_offer) {
        setView('offers');
        const idx = offerGroups.findIndex(g => g[0]?.product_id === target.product_id);
        if (idx >= visibleCount) setVisibleCount(idx + 1);
      } else {
        setView('all');
        const idx = allGroups.findIndex(g => g[0]?.product_id === target.product_id);
        if (idx >= visibleCount) setVisibleCount(idx + 1);
      }
      setHighlightedId(best.id);
      setSearchParams({}, { replace: true });
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      scrollTimer = window.setTimeout(() => {
        document.getElementById(`watchlist-card-${best.id}`)?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }, 150);
      clearTimer = window.setTimeout(() => setHighlightedId(null), 3000);
    }, 0);
    return () => {
      window.clearTimeout(applyTimer);
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [loading, items, allGroups, offerGroups, expiredProducts, visibleCount, searchParams, setSearchParams]);

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
      setError('');
    } catch {
      setError('Failed to remove item');
    }
  }

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function handleAddToList(watchlistId: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token || addedIds.has(watchlistId)) return;
    try {
      await addToShoppingList(token, watchlistId, 1);
      setAddedIds(prev => new Set(prev).add(watchlistId));
      setError('');
      window.setTimeout(() => {
        setAddedIds(prev => {
          const next = new Set(prev);
          next.delete(watchlistId);
          return next;
        });
      }, 1500);
    } catch {
      setError('Failed to add to shopping list');
    }
  }

  function renderGroup(group: WatchlistItem[], expired: boolean) {
    const product = group[0];
    const lastUpdated = Math.max(...group.map(i => i.updated_at));
    const sorted = [...group].sort((a, b) => (a.prices.loyalty ?? a.prices.normal ?? Infinity) - (b.prices.loyalty ?? b.prices.normal ?? Infinity));
    const best = sorted[0];
    if (!product || !best) return null;
    const logo = storeLogoFor(best.store, best.store_logo);

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
              {logo ? (
                <img src={logo} alt={best.store} className="product-card-logo-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span className="product-card-logo-text">{best.store.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          )}
        </div>

        <div className="product-card-bottom">
          <span className="store-card">
            {logo && (
              <img src={logo} alt={best.store} className="store-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
            {best.store}
          </span>
          <h3>{product.product_name}</h3>
          {best.category && (
            <span className={`product-card-category category-${best.category.toLowerCase().replace(/\s+/g, '-')}`}>{best.category}</span>
          )}
          {expired ? (
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
                <span className="product-card-loyalty">
                  <span className={`product-card-loyalty-label ${getLoyaltyClass(best.store)}`} title={best.offer_deal ?? undefined}>{best.offer_deal ? best.offer_deal : getLoyaltyLabel(best.store)}</span>
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
                  <span className={`product-card-loyalty-label ${getLoyaltyClass(best.store)}`} title={best.offer_deal ?? undefined}>{best.offer_deal ? best.offer_deal : getLoyaltyLabel(best.store)}</span>
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
          <button
            onClick={(e) => handleAddToList(best.id, e)}
            className={`product-card-add${addedIds.has(best.id) ? ' is-added' : ''}`}
            title="Add to shopping list"
            aria-label={`Add ${product.product_name} to shopping list`}
          >
            {addedIds.has(best.id) ? <Check size={14} /> : <Plus size={14} />}
            {addedIds.has(best.id) ? 'Added' : 'Add to list'}
          </button>
        </div>
      </>
    );

    const baseClass = expired ? 'product-card is-expired' : 'product-card';
    const cardClass = highlightedId === best.id ? `${baseClass} is-highlighted` : baseClass;
    return best.product_url ? (
      <a
        key={product.product_id}
        id={`watchlist-card-${best.id}`}
        href={best.product_url}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {cardContent}
      </a>
    ) : (
      <div key={product.product_id} id={`watchlist-card-${best.id}`} className={cardClass}>
        {cardContent}
      </div>
    );
  }

  return (
    <div className="page-shell">
      <NavHeader />

      <WatchlistFilters
        selectedStores={selectedStores}
        onStoresChange={(v) => { setSelectedStores(v); handleFilterReset(); }}
        selectedCategories={selectedCategories}
        onCategoriesChange={(v) => { setSelectedCategories(v); handleFilterReset(); }}
        sortBy={sortBy}
        onSortChange={(v) => { setSortBy(v); handleFilterReset(); }}
        searchQuery={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); resetPaging(); }}
        status={view}
        onStatusChange={handleStatusChange}
        statusCounts={statusCounts}
      />

      <div className="container watchlist-content">
        {error && (
          <div className="alert-error watchlist-alert" role="alert">
            {error}
          </div>
        )}

        {!loading && isTrial && (
          <div className="trial-limit-banner">
            <div className="trial-limit-text">
              <span className="trial-limit-title">Trial watchlist</span>
              <span className="trial-limit-sub">
                {trialLimitReached
                  ? 'Limit reached — trial users can pin up to 5 items at a time, register to remove this limit.'
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
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <WatchlistSkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <>
            <div className="empty-state-box">
              <p className="empty-state-title">Your Watchlist is empty</p>
              <p className="empty-state-desc">Find and pin groceries from the search tab.</p>
              <div className="empty-state-cta-wrap">
                <button
                   onClick={() => navigate('/')}
                  className="btn-primary empty-state-cta"
                >
                  <Search size={16} />
                  Search Products
                </button>
              </div>
            </div>
            {!installed && (
              <div className="extension-cta">
                <div className="extension-cta-header">
                  <img src="/favicon.svg" alt="" className="extension-cta-icon" />
                  <span className="extension-cta-title">Sift — Product Extractor</span>
                </div>
                <span className="extension-cta-text">
                  Click the browser icon bottom right to download the extension, it's required to add products directly from store pages.
                </span>
              </div>
            )}
          </>
        )}

        {!loading && items.length > 0 && filtered.length === 0 && searchActive && (
          <div className="empty-state-box">
            <p className="empty-state-title">No results for &ldquo;{searchQuery.trim()}&rdquo;</p>
            <p className="empty-state-desc">Try a different spelling or clear the search.</p>
            <div className="empty-state-cta-wrap">
              <button
                onClick={handleClearSearch}
                className="btn-secondary empty-state-cta"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {!loading && items.length > 0 && filtered.length === 0 && !searchActive && (
          <div className="empty-state-box">
            <p className="empty-state-title">No items match filters</p>
            <p className="empty-state-desc">Try selecting more stores.</p>
          </div>
        )}

        {!loading && visibleProducts.length > 0 && (
          <div className="products-grid">
            {visibleProducts.map(group => renderGroup(group, view === 'expired'))}
          </div>
        )}

        {!loading && currentProducts.length > 0 && hasMore && (
          <div ref={sentinelRef} role="status" aria-live="polite" aria-label={loadingMore ? 'Loading more items' : undefined}>
            {loadingMore && (
              <div className="products-grid">
                {Array.from({ length: moreCount }).map((_, i) => (
                  <WatchlistSkeletonCard key={`more-${i}`} />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !hasMore && currentProducts.length > PAGE_SIZE && (
          <p className="text-sm text-muted watchlist-count">Showing all {currentProducts.length} products</p>
        )}
      </div>
    </div>
  );
}
