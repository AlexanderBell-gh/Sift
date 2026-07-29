import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { getDealOffers, type DealOffer } from '../lib/api';

function DealCard({ deal }: { deal: DealOffer }) {
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
      </div>
      <span className="deal-link">
        Claim
        <ExternalLink className="deal-link-icon" />
      </span>
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