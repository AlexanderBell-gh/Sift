import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ui/useToast';
import { getDealOffers, addToWatchlist, type DealOffer } from '../lib/api';
import type { SearchResult } from '../types';

function DealCard({ deal }: { deal: DealOffer }) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);

  async function handleAddToWatchlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      showToast('Sign in to add to watchlist', 'info');
      return;
    }
    setAdding(true);
    try {
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
        product_url: deal.product_url,
        category: null,
        is_on_offer: deal.is_on_offer,
      };
      await addToWatchlist(token, result);
      showToast('Added to watchlist', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('403') || message.includes('watchlist_limit')) {
        showToast('Trial limit reached — upgrade to add more', 'error');
      } else {
        showToast('Failed to add to watchlist', 'error');
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <a
      href={deal.product_url}
      target="_blank"
      rel="noopener noreferrer"
      className="deal-card"
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
      <div className="deal-info">
        <span className="deal-name">{deal.product_name}</span>
        <div className="deal-prices">
          {deal.prices.normal != null && (
            <span className="lowest-core-old">
              £{deal.prices.normal.toFixed(2)}
            </span>
          )}
          {deal.prices.loyalty != null && (
            <span className="deal-price">
              £{deal.prices.loyalty.toFixed(2)}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToWatchlist}
          disabled={adding}
          className="deal-watchlist-btn"
        >
          {adding ? 'Adding...' : 'Add to watchlist'}
        </button>
      </div>
    </a>
  );
}

export function DealSection() {
  const [deals, setDeals] = useState<DealOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDealOffers()
      .then(data => { if (!cancelled) setDeals(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || deals.length === 0) return null;

  const scrollDeals = [...deals, ...deals];

  return (
    <section className="deals-section">
      <div className="deals-container">
        <h2 className="deals-title">Deals of the Day</h2>
        <div className="deals-track-wrapper">
          <div className="deals-track">
            {scrollDeals.map((deal, i) => (
              <DealCard key={`${deal.product_url}_${i}`} deal={deal} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}