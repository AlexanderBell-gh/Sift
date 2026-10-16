import { useState, useEffect, useMemo, useRef } from 'react';
import type { MouseEvent, TouchEvent } from 'react';
import { Search, Plus, Check, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist, addToShoppingList } from '../../lib/api';
import { STORES, storeLogoFor } from '../../lib/stores';
import { CATEGORIES } from '../../lib/categories';
import { formatDate, formatTimeAgo, isOfferExpired, daysToExpiry, formatDealShort, getLoyaltyLabel, getLoyaltyClass } from '../../lib/utils';
import type { WatchlistItem } from '../../types';
import NavHeader from '../layout/NavHeader';
import { Modal } from '../ui/Modal';
import WatchlistFilters from '../features/watchlist/WatchlistFilters';
import type { OfferStatus } from '../features/watchlist/WatchlistFilters';
import WatchlistSkeletonCard from '../features/watchlist/WatchlistSkeletonCard';
import { useExtensionInstalled } from '../../hooks/useExtensionInstalled';
import { MOBILE_QUERY } from '../../hooks/useIsMobile';

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
    const all: WatchlistItem[][] = [];
    for (const group of products) {
      const best = getBest(group);
      if (isOfferExpired(best.offer_expires_at)) {
        expired.push(group);
      } else if (best.is_on_offer) {
        offers.push(group);
        all.push(group);
      } else {
        plain.push(group);
        all.push(group);
      }
    }
    // All keeps insertion order (newest first): plain items stay where
    // added instead of sinking below all offers. Expired reads
    // most-recently-ended first; undated rows sink last.
    expired.sort((a, b) => {
      const ta = daysToExpiry(getBest(a).offer_expires_at) ?? Number.NEGATIVE_INFINITY;
      const tb = daysToExpiry(getBest(b).offer_expires_at) ?? Number.NEGATIVE_INFINITY;
      return tb - ta;
    });
    return { offerGroups: offers, plainGroups: plain, expiredProducts: expired, allGroups: all };
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

  // Deep-link from alerts (?item=<watchlist_id>): clear filters that could
  // hide the target, switch to owning tab, highlight the exact
  // product tile. Param cleared. Scroll runs in a follow-up effect once
  // the reset filters + view have rendered.
  useEffect(() => {
    if (loading) return;
    const targetId = searchParams.get('item');
    if (!targetId) return;
    const applyTimer = window.setTimeout(() => {
      const target = items.find(i => i.id === targetId);
      if (!target) {
        setSearchParams({}, { replace: true });
        return;
      }
      // Alert target must stay visible: drop any store/category/search
      // selection hiding it (e.g. expired row from another store).
      setSelectedStores(ALL_STORES);
      setSelectedCategories(ALL_CATEGORIES);
      setSearchQuery('');
      if (isOfferExpired(target.offer_expires_at)) {
        setView('expired');
      } else if (target.is_on_offer) {
        setView('offers');
      } else {
        setView('all');
      }
      // Stable per-product anchor: survives cheapest-row (best) drift.
      setHighlightedId(target.product_id);
      setSearchParams({}, { replace: true });
    }, 0);
    return () => {
      window.clearTimeout(applyTimer);
    };
  }, [loading, items, searchParams, setSearchParams]);

  // Follow-up: expand paging until the highlighted product tile renders,
  // then scroll it into view. Highlight persists until navigate away.
  useEffect(() => {
    if (loading || !highlightedId) return;
    const idx = currentProducts.findIndex(g => g[0]?.product_id === highlightedId);
    if (idx === -1) return;
    if (idx >= visibleCount) {
      setVisibleCount(idx + 1);
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`watchlist-card-${highlightedId}`)?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }, 150);
    return () => {
      window.clearTimeout(scrollTimer);
    };
  }, [loading, highlightedId, currentProducts, visibleCount]);

  const isTrial = user?.isTrial === true;
  const watchlistLimit = 5;
  const usedCount = useMemo(() => new Set(items.map(i => i.product_id)).size, [items]);
  const trialLimitReached = isTrial && usedCount >= watchlistLimit;

  // Pending inline removals: staged groups stay in items (cards render
  // dimmed in place with the action slot flipped to Undo) until the user
  // undoes or a filter/view change or unmount commits them. No timer:
  // staged state persists. The mirror ref is the synchronous source of
  // truth (handlers/effects read it); state mirrors it for render.
  // All writes go mirror-first, so racing commits collapse to one.
  const [staged, setStaged] = useState<Map<string, WatchlistItem[]>>(new Map());
  const stagedMirror = useRef(new Map<string, WatchlistItem[]>());
  // Latest-token mirror for the pagehide flush (runs outside render cycle).
  const tokenRef = useRef(token);
  tokenRef.current = token;

  function syncStagedState() {
    setStaged(new Map(stagedMirror.current));
  }

  async function commitStaged(productId: string, group: WatchlistItem[]) {
    if (!stagedMirror.current.has(productId)) return;
    stagedMirror.current.delete(productId);
    syncStagedState();
    if (!token) return;
    try {
      await Promise.all(group.map(i => removeFromWatchlist(token, i.id)));
      setItems(prev => prev.filter(i => i.product_id !== productId));
      setError('');
    } catch {
      setError('Failed to remove item');
    }
  }

  function commitAllStaged() {
    for (const [productId, group] of Array.from(stagedMirror.current.entries())) {
      void commitStaged(productId, group);
    }
  }

  function handleRemoveProduct(productId: string, e: { preventDefault(): void; stopPropagation(): void }) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;
    const group = items.filter(i => i.product_id === productId);
    if (group.length === 0 || stagedMirror.current.has(productId)) return;
    // Optimistic: card dims in place, action slot flips to Undo.
    stagedMirror.current.set(productId, group);
    syncStagedState();
  }

  function undoRemoval(productId: string) {
    if (!stagedMirror.current.has(productId)) return;
    stagedMirror.current.delete(productId);
    syncStagedState();
  }

  // Removed cards never leak across views: any filter/sort/search/status
  // change commits pending removals first. Unmount flushes too.
  useEffect(() => {
    commitAllStaged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStores, selectedCategories, sortBy, searchQuery, view]);
  useEffect(() => () => {
    for (const [productId, group] of Array.from(stagedMirror.current.entries())) {
      void commitStaged(productId, group);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh/close-tab skips React unmount cleanups entirely, so staged
  // removals would die with the page and the item would reappear. Flush
  // them on pagehide; keepalive DELETEs survive unload. Undo and
  // filter-change commits are unchanged.
  useEffect(() => {
    function handlePageHide() {
      const t = tokenRef.current;
      if (!t) return;
      for (const group of Array.from(stagedMirror.current.values())) {
        for (const item of group) {
          void removeFromWatchlist(t, item.id).catch(() => {});
        }
      }
      stagedMirror.current.clear();
    }
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Bulk clear of the expired tab: two-tap confirm (4s window, Escape
  // cancels), mirroring the shopping-list clear pattern. Commits
  // immediately with rollback on failure; staged rows for cleared
  // products are dropped so their commits cannot 404 after the fact.
  const [confirmClearExpired, setConfirmClearExpired] = useState(false);
  const clearExpiredTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(clearExpiredTimer.current), []);

  async function handleClearExpired() {
    if (!token) return;
    if (!confirmClearExpired) {
      setConfirmClearExpired(true);
      window.clearTimeout(clearExpiredTimer.current);
      clearExpiredTimer.current = window.setTimeout(() => setConfirmClearExpired(false), 4000);
      return;
    }
    window.clearTimeout(clearExpiredTimer.current);
    setConfirmClearExpired(false);
    const groups = expiredProducts;
    if (groups.length === 0) return;
    const ids = new Set(groups.flatMap(g => g.map(i => i.id)));
    for (const group of groups) {
      const pid = group[0]?.product_id;
      if (pid) stagedMirror.current.delete(pid);
    }
    syncStagedState();
    const prev = items;
    setItems(prevItems => prevItems.filter(i => !ids.has(i.id)));
    setError('');
    try {
      await Promise.all(groups.flatMap(g => g.map(i => removeFromWatchlist(token, i.id))));
    } catch {
      setItems(prev);
      setError('Failed to clear expired items');
    }
  }

  // Mobile hold-to-remove: long-press a card to remove its product group.
  // Desktop keeps the ✕ button; timers only start under the 640px breakpoint.
  const holdRef = useRef<{ timer: number | undefined; productId: string | null; x: number; y: number }>({
    timer: undefined,
    productId: null,
    x: 0,
    y: 0,
  });
  const lastHoldRef = useRef(0);
  const [pendingRemove, setPendingRemove] = useState<{ productId: string; name: string; store: string } | null>(null);

  function clearHold() {
    if (holdRef.current.timer !== undefined) {
      window.clearTimeout(holdRef.current.timer);
      holdRef.current.timer = undefined;
    }
    holdRef.current.productId = null;
  }

  function startHold(productId: string, e: TouchEvent) {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    const touch = e.touches[0];
    if (!touch) return;
    const group = items.filter(i => i.product_id === productId);
    const first = group[0];
    if (!first) return;
    const pending = {
      productId,
      name: first.product_name,
      store: first.store,
    };
    clearHold();
    holdRef.current.productId = productId;
    holdRef.current.x = touch.clientX;
    holdRef.current.y = touch.clientY;
    holdRef.current.timer = window.setTimeout(() => {
      lastHoldRef.current = Date.now();
      setPendingRemove(pending);
      clearHold();
    }, 600);
  }

  function moveHold(e: TouchEvent) {
    if (holdRef.current.timer === undefined) return;
    const touch = e.touches[0];
    if (!touch) return;
    if (Math.hypot(touch.clientX - holdRef.current.x, touch.clientY - holdRef.current.y) > 10) {
      clearHold();
    }
  }

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
    // Staged removal: full details stay in place, dimmed; the action
    // slot flips to Undo and persists until undo or commit.
    const isStaged = staged.has(product.product_id);
    const logo = storeLogoFor(best.store, best.store_logo);
    const veilClass = isStaged ? ' product-card-removed-veil' : '';
    const days = daysToExpiry(best.offer_expires_at);
    const endedAgo = days !== null && days <= 0 ? (days === 0 ? 'today' : `${-days}d ago`) : null;

    const cardContent = (
      <>
        <div className={`product-card-media${veilClass}`}>
          {logo && (
            <span className="product-card-store-logo">
              <img src={logo} alt={best.store} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </span>
          )}
          {best.image_url ? (
            <img src={best.image_url} alt="" className="product-card-media-img" />
          ) : logo ? (
            <img src={logo} alt="" className="product-card-media-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <span className="product-card-media-text">{best.store.slice(0, 2).toUpperCase()}</span>
          )}
        </div>

        <div className={`product-card-body${veilClass}`}>
          <h3 className="product-card-name">{product.product_name}</h3>
          {best.category && (
            <span className={`product-card-category category-${best.category.toLowerCase().replace(/\s+/g, '-')}`}>{best.category}</span>
          )}
          <div className="product-card-price">
            {expired ? (
              <>
                <span className="expired-price">
                  £{(best.prices.normal ?? best.prices.loyalty ?? 0).toFixed(2)}
                </span>
                {best.prices.normal !== null && best.prices.loyalty !== null && (
                  <span className="was-price">was £{best.prices.loyalty.toFixed(2)}</span>
                )}
              </>
            ) : best.offer_deal ? (
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
            <span className={`product-card-loyalty-label ${getLoyaltyClass(best.store)}`} title={best.offer_deal ?? undefined}>{best.offer_deal ? formatDealShort(best.offer_deal) : getLoyaltyLabel(best.store)}</span>
          )}
          {expired ? (
            <span className="product-card-offer expired">
              Offer expired{endedAgo ? ` · Ended ${endedAgo}` : ''}
            </span>
          ) : (
            best.offer_expires_at && days !== null && days > 0 && (
              <span className="product-card-offer">
                {days <= 7 ? `Ends in ${days}d · ` : 'Ends '}{formatDate(best.offer_expires_at)}
              </span>
            )
          )}
          {!expired && (
            <p className="product-card-updated">Updated {formatTimeAgo(lastUpdated)}</p>
          )}
        </div>

        <div className="product-card-foot">
          <button
            onClick={(e) => handleAddToList(best.id, e)}
            className={`product-card-add${addedIds.has(best.id) ? ' is-added' : ''}`}
            title="Add to shopping list"
            aria-label={`Add ${product.product_name} to shopping list`}
            disabled={isStaged}
          >
            {addedIds.has(best.id) ? <Check size={14} /> : <Plus size={14} />}
            {addedIds.has(best.id) ? 'Added' : 'Add to list'}
          </button>
          {isStaged ? (
            <button
              type="button"
              onClick={() => undoRemoval(product.product_id)}
              className="product-card-remove is-undo"
              aria-label={`Undo remove ${product.product_name} from watchlist`}
            >
              Undo
            </button>
          ) : (
            <button
              onClick={(e) => handleRemoveProduct(product.product_id, e)}
              className="product-card-remove"
              title="Remove"
              aria-label={`Remove ${product.product_name} from watchlist`}
            >
              ✕
            </button>
          )}
        </div>
      </>
    );

    const baseClass = expired ? 'product-card is-expired' : 'product-card';
    const highlightedClass = highlightedId === product.product_id ? ' is-highlighted' : '';
    const cardClass = `${baseClass}${highlightedClass}${isStaged ? ' is-removed' : ''}`;
    // Staged cards render as a status div (no navigation); Undo announces.
    if (isStaged) {
      return (
        <div key={product.product_id} role="status" className={cardClass}>
          {cardContent}
        </div>
      );
    }
    // Suppress the link navigation if a hold-to-remove just fired on this card.
    function handleCardClickCapture(e: MouseEvent) {
      if (Date.now() - lastHoldRef.current < 1000) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    const holdHandlers = {
      onTouchStart: (e: TouchEvent) => startHold(product.product_id, e),
      onTouchMove: moveHold,
      onTouchEnd: clearHold,
      onTouchCancel: clearHold,
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
    };
    return best.product_url ? (
      <a
        key={product.product_id}
        id={`watchlist-card-${product.product_id}`}
        href={best.product_url}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
        onClickCapture={handleCardClickCapture}
        {...holdHandlers}
      >
        {cardContent}
      </a>
    ) : (
      <div key={product.product_id} id={`watchlist-card-${product.product_id}`} className={cardClass} {...holdHandlers}>
        {cardContent}
      </div>
    );
  }

  return (
    <div className="page-shell">
      <NavHeader staticNav />

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

        {!loading && view === 'expired' && expiredProducts.length > 0 && (
          <div className="expired-clear-row">
            <p className="expired-clear-count" aria-live="polite">
              {expiredProducts.length} expired
            </p>
            <button
              onClick={handleClearExpired}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && confirmClearExpired) {
                  window.clearTimeout(clearExpiredTimer.current);
                  setConfirmClearExpired(false);
                }
              }}
              aria-live="polite"
              className={`btn-secondary expired-clear${confirmClearExpired ? ' expired-clear-confirm' : ''}`}
            >
              <Trash2 size={14} />
              {confirmClearExpired ? 'Confirm clear?' : 'Clear expired'}
            </button>
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

      <Modal
        isOpen={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        title="Remove from watchlist"
      >
        {pendingRemove && (
          <>
            <p className="text-sm">
              Remove <strong>{pendingRemove.name}</strong>
              {pendingRemove.store ? ` (${pendingRemove.store})` : ''} from your watchlist?
            </p>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setPendingRemove(null)}
              >
                Cancel
              </button>
              <button
                className="btn-danger flex-1"
                onClick={(e) => {
                  handleRemoveProduct(pendingRemove.productId, e);
                  setPendingRemove(null);
                }}
              >
                Remove
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
