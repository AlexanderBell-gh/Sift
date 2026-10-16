import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { addToWatchlist, ApiError, type DealOffer } from '../../../lib/api';
import { daysToExpiry, formatDate, formatDealShort, getLoyaltyClass, getLoyaltyLabel, isOfferExpired } from '../../../lib/utils';
import { storeLogoFor } from '../../../lib/stores';
import { PinButton } from './PinButton';
import type { SearchResult } from '../../../types';

export function OfferTile({ deal, limitReached, onAdded }: {
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
  // Popular shows every pinned item, so expired offers reach this tile:
  // they render as plain regular-price rows (shelf price, no labels),
  // expired status lives only in the watchlist.
  const expired = isOfferExpired(deal.offer_expires_at);

  return (
    <article className="offer-tile">
      <a
        href={deal.product_url}
        target="_blank"
        rel="noopener noreferrer"
        className="offer-tile-media"
        aria-label={`${deal.product_name} at ${deal.store} (opens in new tab)`}
      >
        {logo && (
          <span className="product-card-store-logo" aria-hidden="true">
            <img src={logo} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </span>
        )}
        {deal.image_url ? (
          <img src={deal.image_url} alt="" className="offer-tile-img" loading="lazy" />
        ) : (
          <span className="offer-tile-fallback">{deal.store.slice(0, 2).toUpperCase()}</span>
        )}
      </a>
      <div className="offer-tile-body">
        <a
          href={deal.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="offer-tile-name"
        >
          {deal.product_name}
        </a>
        <div className="offer-tile-price">
          {expired ? (
            <span className="offer-price">£{(deal.prices.normal ?? deal.prices.loyalty ?? 0).toFixed(2)}</span>
          ) : deal.offer_deal ? (
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
        {!expired && (deal.offer_deal || deal.prices.loyalty != null) && (
          <span className={`product-card-loyalty-label ${getLoyaltyClass(deal.store)}`} title={deal.offer_deal ?? undefined}>
            {deal.offer_deal ? formatDealShort(deal.offer_deal) : getLoyaltyLabel(deal.store)}
          </span>
        )}
        {!expired && deal.offer_expires_at && days !== null && days > 0 && (
          <span className="offer-tile-expiry">
            {days <= 7 ? `Ends in ${days}d · ` : 'Ends '}{formatDate(deal.offer_expires_at)}
          </span>
        )}
        {deal.pins != null && (
          <span className="offer-pins">
            {deal.pins} pin{deal.pins === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {token && (
        <div className="offer-tile-foot">
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
      {notice && (
        <span className="danger-text text-xs" role="status">
          {notice}
        </span>
      )}
    </article>
  );
}

export function OfferTileSkeleton() {
  return (
    <div className="offer-tile" aria-hidden="true">
      <div className="skeleton offer-tile-media offer-tile-media-skeleton" />
      <div className="offer-tile-body">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-title skeleton-title-short" />
        <div className="skeleton skeleton-price" />
        <div className="skeleton skeleton-badge" />
      </div>
      <div className="offer-tile-foot">
        <div className="skeleton skeleton-add" />
      </div>
    </div>
  );
}
