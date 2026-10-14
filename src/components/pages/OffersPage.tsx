import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addToWatchlist, getDealOffers, getPopular, ApiError, type DealOffer } from '../../lib/api';
import { daysToExpiry, formatDate, formatDealShort, getLoyaltyClass, getLoyaltyLabel, isOfferExpired, parseDate } from '../../lib/utils';
import { storeLogoFor, STORES } from '../../lib/stores';
import NavHeader from '../layout/NavHeader';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTrialPinCount } from '../../hooks/useTrialPinCount';
import OffersFilterBar from '../features/search/OffersFilterBar';
import { PinButton } from '../features/search/PinButton';
import WatchlistSkeletonCard from '../features/watchlist/WatchlistSkeletonCard';
import type { SearchResult } from '../../types';

const ENDING_SOON_DAYS = 7;
const GRID_PAGE_SIZE = 12;

function expiryTime(deal: DealOffer): number {
  const date = parseDate(deal.offer_expires_at);
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

function isEndingSoon(deal: DealOffer): boolean {
  if (isOfferExpired(deal.offer_expires_at)) return false;
  const date = parseDate(deal.offer_expires_at);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = (date.getTime() - today.getTime()) / 86400000;
  return diffDays > 0 && diffDays <= ENDING_SOON_DAYS;
}

function byExpiryAsc(a: DealOffer, b: DealOffer): number {
  return expiryTime(a) - expiryTime(b);
}

function OfferGridCard({ deal, limitReached, onAdded }: {
  deal: DealOffer;
  limitReached: boolean;
  onAdded: () => void;
}) {
  const { token } = useAuth();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => {
      setAdded(false);
      setPinned(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [added]);

  function handlePin() {
    if (!token) return;
    setAdding(true);
    setNotice(null);
    const result: SearchResult = {
      id: deal.product_id,
      name: deal.product_name,
      store: deal.store,
      store_logo: deal.store_logo,
      image_url: deal.image_url,
      unit: null,
      prices: deal.prices,
      loyalty_type: deal.loyalty_type,
      offer_expires_at: deal.offer_expires_at,
      offer_deal: deal.offer_deal,
      product_url: deal.product_url,
      category: deal.category,
      is_on_offer: deal.is_on_offer,
    };
    addToWatchlist(token, result)
      .then(() => {
        onAdded();
        setAdded(true);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && (err.status === 403 || err.reason === 'watchlist_limit')) {
          setNotice('Trial limit reached — upgrade to add more.');
        } else if (err instanceof ApiError && err.reason === 'trial_expired') {
          setNotice('Your trial has expired.');
        } else {
          setNotice('Failed to add to watchlist');
        }
      })
      .finally(() => setAdding(false));
  }

  const logo = storeLogoFor(deal.store, deal.store_logo);
  const days = daysToExpiry(deal.offer_expires_at);

  return (
    <div className="product-card">
      <a
        href={deal.product_url}
        target="_blank"
        rel="noopener noreferrer"
        className="product-card-media-link"
        aria-label={`${deal.product_name} at ${deal.store} (opens in new tab)`}
      >
        <span className="product-card-media">
          {logo && (
            <span className="product-card-store-logo" aria-hidden="true">
              <img src={logo} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </span>
          )}
          {deal.image_url ? (
            <img src={deal.image_url} alt="" className="product-card-media-img" loading="lazy" />
          ) : logo ? (
            <img src={logo} alt="" className="product-card-media-img" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <span className="product-card-media-text">{deal.store.slice(0, 2).toUpperCase()}</span>
          )}
        </span>
      </a>
      <div className="product-card-body">
        <h3 className="product-card-name">{deal.product_name}</h3>
        {deal.category && (
          <span className={`product-card-category category-${deal.category.toLowerCase().replace(/\s+/g, '-')}`}>
            {deal.category}
          </span>
        )}
        <div className="product-card-price">
          {deal.offer_deal ? (
            <span className="offer-price">£{(deal.prices.normal ?? 0).toFixed(2)}</span>
          ) : (
            <>
              {deal.prices.normal != null && deal.prices.loyalty != null && (
                <span className="full-price">£{deal.prices.normal.toFixed(2)}</span>
              )}
              <span className="offer-price">
                £{(deal.prices.loyalty ?? deal.prices.normal ?? 0).toFixed(2)}
              </span>
            </>
          )}
        </div>
        {(deal.offer_deal || deal.prices.loyalty != null) && (
          <span className={`product-card-loyalty-label ${getLoyaltyClass(deal.store)}`} title={deal.offer_deal ?? undefined}>
            {deal.offer_deal ? formatDealShort(deal.offer_deal) : getLoyaltyLabel(deal.store)}
          </span>
        )}
        {deal.offer_expires_at && days !== null && days > 0 && (
          <span className="product-card-offer">
            {days <= 7 ? `Ends in ${days}d · ` : 'Offer ends '}{formatDate(deal.offer_expires_at)}
          </span>
        )}
        {deal.pins != null && (
          <span className="offer-pins">
            {deal.pins} pin{deal.pins === 1 ? '' : 's'}
          </span>
        )}
        {notice && (
          <span className="danger-text text-xs" role="status">{notice}</span>
        )}
      </div>
      {token && (
        <div className="product-card-foot">
          <PinButton
            name={deal.product_name}
            adding={adding}
            added={added}
            pinned={pinned}
            limitReached={limitReached}
            onPin={handlePin}
          />
        </div>
      )}
    </div>
  );
}

// Keyed by view so batch state resets on every tab switch.
function OffersGrid({ viewKey, items, limitReached, onAdded }: {
  viewKey: string;
  items: DealOffer[];
  limitReached: boolean;
  onAdded: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(GRID_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  const hasMore = visibleCount < items.length;
  const visibleItems = items.slice(0, visibleCount);
  const moreCount = Math.min(GRID_PAGE_SIZE, items.length - visibleCount);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !pendingRef.current) {
          pendingRef.current = true;
          setLoadingMore(true);
          timerRef.current = window.setTimeout(() => {
            setVisibleCount((c) => Math.min(c + GRID_PAGE_SIZE, items.length));
            setLoadingMore(false);
            pendingRef.current = false;
          }, 600);
        }
      },
      { rootMargin: '600px' }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timerRef.current);
    };
  }, [hasMore, items.length]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <div key={viewKey}>
      <div className="products-grid offers-modal-grid">
        {visibleItems.map((deal) => (
          <OfferGridCard key={deal.product_url} deal={deal} limitReached={limitReached} onAdded={onAdded} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} role="status" aria-live="polite" aria-label={loadingMore ? 'Loading more items' : undefined}>
          {loadingMore && (
            <div className="products-grid offers-modal-grid" aria-hidden="true">
              {Array.from({ length: moreCount }).map((_, i) => (
                <WatchlistSkeletonCard key={`more-${i}`} />
              ))}
            </div>
          )}
        </div>
      )}
      {!hasMore && items.length > GRID_PAGE_SIZE && (
        <p className="text-sm text-muted text-center watchlist-count">Showing all {items.length} items</p>
      )}
    </div>
  );
}

type View = 'all' | 'ending' | 'popular';

const ALL_STORES = STORES.map(s => s.name);
const OFFERS_STORES_KEY = 'sift-offers-stores';

function loadStoredStores(): string[] {
  try {
    const saved = localStorage.getItem(OFFERS_STORES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      const valid = parsed.filter((n) => ALL_STORES.includes(n));
      if (valid.length > 0) return valid;
    }
  } catch {
    // fall through to all stores
  }
  return ALL_STORES;
}

export default function OffersPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paramView = params.get('view');
  const view: View = paramView === 'ending' ? 'ending' : paramView === 'popular' ? 'popular' : 'all';
  // Mobile keeps the thumb-sized button; desktop gets a quiet text link.
  const isMobile = useIsMobile();

  const [deals, setDeals] = useState<DealOffer[]>([]);
  const [popularDeals, setPopularDeals] = useState<DealOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [popularLoading, setPopularLoading] = useState(true);
  const [selectedStores, setSelectedStores] = useState<string[]>(loadStoredStores);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem(OFFERS_STORES_KEY, JSON.stringify(selectedStores));
  }, [selectedStores]);

  const isTrial = !!user?.isTrial;
  const { limitReached, handleAdded } = useTrialPinCount(token, isTrial);

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    getDealOffers(token)
      .then(setDeals)
      .catch(() => {})
      .finally(() => setLoading(false));
    getPopular(token)
      .then(setPopularDeals)
      .catch(() => {})
      .finally(() => setPopularLoading(false));
  }, [token, navigate]);

  const { offers, endingSoon } = useMemo(() => {
    const live = deals.filter(d => d.is_on_offer && !isOfferExpired(d.offer_expires_at));
    const soon = live.filter(isEndingSoon).sort(byExpiryAsc);
    const soonUrls = new Set(soon.map(d => d.product_url));
    const rest = live.filter(d => !soonUrls.has(d.product_url)).sort(byExpiryAsc);
    return { offers: rest, endingSoon: soon };
  }, [deals]);

  const items = view === 'popular' ? popularDeals : view === 'ending' ? endingSoon : offers;
  const filtered = items.filter((d) => selectedStores.includes(d.store));
  const q = searchQuery.trim().toLowerCase();
  const queryFiltered = q ? filtered.filter((d) => d.product_name.toLowerCase().includes(q)) : filtered;
  const title = view === 'popular' ? 'Popular right now' : view === 'ending' ? 'Offers ending in 7 days' : 'All offers';
  const emptyText = view === 'popular' ? 'No popular items right now.' : 'No offers right now.';
  const pageLoading = loading || popularLoading;

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavHeader staticNav />
      <OffersFilterBar view={view} selectedStores={selectedStores} onStoresChange={setSelectedStores} searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <main className="container offers-content pb-24">
        {isMobile ? (
          <Link to="/" className="btn-secondary mt-4" aria-label="Back to search">
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
        ) : (
          <Link to="/" className="nav-link mt-4 inline-flex items-center gap-1.5" aria-label="Back to search">
            <ArrowLeft size={14} aria-hidden="true" />
            Back
          </Link>
        )}
        <div className="offers-head mt-4">
          <h1 className="offers-title">
            {title}
            {!pageLoading && queryFiltered.length > 0 && (
              <span className="offers-count">{queryFiltered.length}</span>
            )}
          </h1>
        </div>
        <div className="mt-6">
          {pageLoading ? (
            <div className="products-grid offers-modal-grid" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <WatchlistSkeletonCard key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted">{emptyText}</p>
          ) : filtered.length === 0 ? (
            <div className="empty-state-box">
              <p className="empty-state-title">No offers for the selected stores</p>
              <p className="empty-state-desc">Try selecting more stores.</p>
              <div className="empty-state-cta-wrap">
                <button type="button" className="btn-secondary" onClick={() => setSelectedStores(ALL_STORES)}>
                  Show all stores
                </button>
              </div>
            </div>
          ) : queryFiltered.length === 0 ? (
            <div className="empty-state-box">
              <p className="empty-state-title">No matches for “{searchQuery.trim()}”</p>
              <p className="empty-state-desc">Try a different search.</p>
              <div className="empty-state-cta-wrap">
                <button type="button" className="btn-secondary" onClick={() => setSearchQuery('')}>
                  Clear search
                </button>
              </div>
            </div>
          ) : (
            <OffersGrid viewKey={`${view}|${selectedStores.join(',')}|${q}`} items={queryFiltered} limitReached={limitReached} onAdded={handleAdded} />
          )}
        </div>
      </main>
    </div>
  );
}
