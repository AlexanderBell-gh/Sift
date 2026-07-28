import { useState, useEffect } from 'react';
import { getBannerOffers, type BannerOffer } from '../lib/api';

export function OfferBanner() {
  const [offers, setOffers] = useState<BannerOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getBannerOffers()
      .then(data => { if (!cancelled) setOffers(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || offers.length === 0) return null;

  return (
    <div className="offer-banner">
      <div className="offer-banner-track">
        {offers.concat(offers).map((offer, i) => (
          <a
            key={i}
            href={offer.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="offer-banner-item"
            title={`${offer.product_name} — ${offer.store}`}
          >
            <img
              src={offer.store_logo}
              alt=""
              className="offer-banner-logo"
            />
            <span className="offer-banner-name">{offer.product_name}</span>
            {offer.prices.loyalty != null && (
              <span className="offer-banner-price">
                £{offer.prices.loyalty.toFixed(2)}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
