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
      <img
        src={deal.store_logo}
        alt=""
        className="deal-logo"
      />
      <span className="deal-name">{deal.product_name}</span>
      {deal.prices.loyalty != null && (
        <span className="deal-price">
          £{deal.prices.loyalty.toFixed(2)}
        </span>
      )}
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

  return (
    <section className="deals-section">
      <div className="deals-container">
        <h2 className="deals-title">Deals of the Day</h2>
        <div className="deals-grid">
          {deals.map(deal => (
            <DealCard key={deal.product_url} deal={deal} />
          ))}
        </div>
      </div>
    </section>
  );
}