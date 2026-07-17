import { ExternalLink } from 'lucide-react';
import { STORES } from '../lib/stores';

export function StoreOffers() {
  return (
    <section className="store-offers-section">
      <div className="store-offers-container">
        <h2 className="store-offers-title">Browse Store Offers</h2>
        <div className="store-offers-scroll">
          {STORES.map((store) => (
            <a
              key={store.id}
              href={store.offersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="store-offers-card"
            >
              <img
                src={store.logo}
                alt={store.name}
                className="store-offers-logo"
              />
              <span className="store-offers-name">{store.name}</span>
              <ExternalLink className="store-offers-icon" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
