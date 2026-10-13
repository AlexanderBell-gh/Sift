import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { addToWatchlist, ApiError, type DealOffer } from '../../../lib/api';
import {
  daysToExpiry,
  formatDate,
  formatDealShort,
  getLoyaltyClass,
  getLoyaltyLabel,
} from '../../../lib/utils';
import { storeLogoFor } from '../../../lib/stores';
import { PinButton } from './PinButton';
import WatchlistSkeletonCard from '../watchlist/WatchlistSkeletonCard';
import type { SearchResult } from '../../../types';

function ModalOfferCard({ deal, limitReached, onAdded }: {
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

const MODAL_PAGE_SIZE = 12;

// Mounted only while the modal is open, so batch state resets
// naturally on every open (Modal unmounts its children on close).
function OffersModalGrid({ items, limitReached, onAdded }: {
  items: DealOffer[];
  limitReached: boolean;
  onAdded: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(MODAL_PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  const hasMore = visibleCount < items.length;
  const visibleItems = items.slice(0, visibleCount);
  const moreCount = Math.min(MODAL_PAGE_SIZE, items.length - visibleCount);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !pendingRef.current) {
          pendingRef.current = true;
          setLoadingMore(true);
          timerRef.current = window.setTimeout(() => {
            setVisibleCount((c) => Math.min(c + MODAL_PAGE_SIZE, items.length));
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
    <>
      <div className="products-grid offers-modal-grid">
        {visibleItems.map((deal) => (
          <ModalOfferCard key={deal.product_url} deal={deal} limitReached={limitReached} onAdded={onAdded} />
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
      {!hasMore && items.length > MODAL_PAGE_SIZE && (
        <p className="text-sm text-muted">Showing all {items.length} items</p>
      )}
    </>
  );
}

export function OffersModal({ isOpen, onClose, title, items, loading, limitReached, onAdded }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: DealOffer[];
  loading: boolean;
  limitReached: boolean;
  onAdded: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={loading ? title : `${title} (${items.length})`}
      className="sm:max-w-4xl max-w-4xl"
    >
      {loading ? (
        <div className="products-grid offers-modal-grid" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <WatchlistSkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No offers right now.</p>
      ) : (
        <OffersModalGrid items={items} limitReached={limitReached} onAdded={onAdded} />
      )}
    </Modal>
  );
}
