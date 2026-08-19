import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import { getDealOffers, addToWatchlist, getPinnedIds, ApiError, type DealOffer } from '../lib/api';
import { getLoyaltyLabel, getLoyaltyClass, cleanDealText } from '../lib/utils';
import type { SearchResult } from '../types';

const TRIAL_LIMIT = 5;

function DealCard({ deal, limitReached, onAdded }: { deal: DealOffer; limitReached: boolean; onAdded: () => void }) {
  const { token } = useAuth();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  function handleAddToWatchlist() {
    if (!token) {
      setNotice({ text: 'Sign in to add to watchlist', type: 'info' });
      return;
    }
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
      .then(onAdded)
      .catch((err: unknown) => {
        if (err instanceof ApiError && (err.status === 403 || err.reason === 'watchlist_limit')) {
          setNotice({ text: 'Trial limit reached — upgrade to add more', type: 'error' });
        } else if (err instanceof ApiError && err.reason === 'trial_expired') {
          setNotice({ text: 'Your trial has expired', type: 'error' });
        } else {
          setNotice({ text: 'Failed to add to watchlist', type: 'error' });
        }
      })
      .finally(() => setAdding(false));
  }

  return (
    <div className="deal-card">
      <a
        href={deal.product_url}
        target="_blank"
        rel="noopener noreferrer"
        className="deal-card-link"
      >
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt=""
            className="deal-image"
          />
        ) : (
          <div className="deal-image-placeholder">
            <img
              src={deal.store_logo}
              alt=""
              className="deal-logo"
            />
          </div>
        )}
        <span className="store-card">
          {deal.store_logo && (
            <img src={deal.store_logo} alt={deal.store} className="store-logo" />
          )}
          {deal.store}
        </span>
        <div className="deal-info">
          <span className="deal-name">{deal.product_name}</span>
          <div className="deal-prices">
            {deal.offer_deal ? (
              <span className="offer-price">
                £{(deal.prices.normal ?? 0).toFixed(2)}
              </span>
            ) : (
              <>
                {deal.prices.normal != null && (
                  <span className="full-price">
                    £{deal.prices.normal.toFixed(2)}
                  </span>
                )}
                {deal.prices.loyalty != null && (
                  <span className="deal-price">
                    £{deal.prices.loyalty.toFixed(2)}
                  </span>
                )}
              </>
            )}
          </div>
          {(deal.offer_deal || deal.prices.loyalty != null) && (
            <span className={`product-card-loyalty-label ${getLoyaltyClass(deal.store)}`}>
              {deal.offer_deal ? cleanDealText(deal.offer_deal) : getLoyaltyLabel(deal.store)}
            </span>
          )}
        </div>
      </a>
      <button
        onClick={handleAddToWatchlist}
        disabled={adding || limitReached}
        className="deal-watchlist-btn"
        aria-label={`Add ${deal.product_name} to watchlist`}
      >
        {adding ? 'Adding...' : 'Add to watchlist'}
      </button>
      {notice && (
        <span className={`deal-watchlist-notice ${notice.type === 'error' ? 'danger-text' : 'text-muted'} text-xs`}>
          {notice.text}
        </span>
      )}
    </div>
  );
}

export function DealSection() {
  const { user, token } = useAuth();
  const [deals, setDeals] = useState<DealOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinnedCount, setPinnedCount] = useState<number | null>(null);

  const isTrial = !!user?.isTrial;

  useEffect(() => {
    let cancelled = false;
    getDealOffers()
      .then(data => { if (!cancelled) setDeals(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isTrial || !token) return;
    let cancelled = false;
    getPinnedIds(token)
      .then(ids => { if (!cancelled) setPinnedCount(new Set(ids.map(i => i.product_id)).size); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isTrial, token]);

  async function handleAdded() {
    if (!isTrial || !token) return;
    try {
      const ids = await getPinnedIds(token);
      setPinnedCount(new Set(ids.map(i => i.product_id)).size);
    } catch {
      // keep previous count
    }
  }

  const limitReached = isTrial && pinnedCount !== null && pinnedCount >= TRIAL_LIMIT;

  if (loading || deals.length === 0) return null;

  const scrollDeals = [...deals, ...deals];

  return (
    <section className="deals-section">
      <div className="deals-container">
        <h2 className="deals-title">Deals of the Day</h2>
        <div className="deals-track-wrapper">
          <div className="deals-track">
            {scrollDeals.map((deal, i) => (
              <DealCard key={`${deal.product_url}_${i}`} deal={deal} limitReached={limitReached} onAdded={handleAdded} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}