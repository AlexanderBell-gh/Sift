import { useState } from 'react';
import { MapPin, ExternalLink, Tag } from 'lucide-react';
import type { SearchResult } from '../types';

interface Props {
  result: SearchResult;
  authenticated?: boolean;
  pinned?: boolean;
  onPin?: () => void;
}

function formatPrice(value: number | null): string | null {
  if (value === null) return null;
  return `£${value.toFixed(2)}`;
}

export default function SearchResultCard({ result, authenticated, pinned, onPin }: Props) {
  const [imgError, setImgError] = useState(false);
  const { name, store, store_logo, image_url, unit, prices, loyalty_type, offer_expires_at, product_url, is_on_offer } = result;

  const normalPrice = formatPrice(prices.normal);
  const loyaltyPrice = formatPrice(prices.loyalty);
  const unitPrice = formatPrice(prices.unit_price);

  const offerExpired = offer_expires_at ? new Date(offer_expires_at) < new Date() : false;

  return (
    <div className="product-card group relative animate-fade-in-up">
      {is_on_offer && !offerExpired && (
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/90 text-white shadow-lg">
            <Tag className="w-3 h-3" />
            ON OFFER
          </span>
        </div>
      )}

      {authenticated && onPin && (
        <button
          onClick={onPin}
          className={`absolute top-3 right-3 z-10 p-2 rounded-lg transition-colors ${
            pinned
              ? 'bg-accent text-black'
              : 'bg-black/30 text-white/70 hover:text-white hover:bg-black/50 backdrop-blur-sm'
          }`}
          title={pinned ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <MapPin className={`w-4 h-4 ${pinned ? 'fill-current' : ''}`} />
        </button>
      )}

      <a href={product_url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="product-image">
          {image_url && !imgError ? (
            <img
              src={image_url}
              alt={name}
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-medium">
              {store.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </a>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {store_logo && (
            <img src={store_logo} alt={store} className="w-5 h-5 rounded-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{store}</span>
        </div>

        <a href={product_url} target="_blank" rel="noopener noreferrer">
          <h3 className="font-medium text-zinc-800 dark:text-white leading-snug line-clamp-2 hover:text-accent transition-colors">
            {name}
          </h3>
        </a>

        {unit && (
          <p className="text-xs text-zinc-400">{unit}</p>
        )}

        <div className="flex items-baseline gap-3">
          {normalPrice && (
            <span className="price-display text-zinc-800 dark:text-white">{normalPrice}</span>
          )}
          {loyaltyPrice && loyaltyPrice !== normalPrice && (
            <span className="text-sm font-medium text-emerald-500">{loyaltyPrice}</span>
          )}
          {unitPrice && (
            <span className="text-xs text-zinc-400">({unitPrice}/{unit?.replace(/[\d.\s]/g, '') || 'unit'})</span>
          )}
        </div>

        {loyalty_type && loyaltyPrice && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {loyalty_type}
            </span>
            <span className="text-xs text-zinc-400">price</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          {offer_expires_at && !offerExpired && (
            <span className="text-[11px] text-amber-500 font-medium">
              Offer ends {new Date(offer_expires_at).toLocaleDateString('en-GB')}
            </span>
          )}
          {offerExpired && (
            <span className="text-[11px] text-zinc-500">Offer expired</span>
          )}
          <a
            href={product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-zinc-400 hover:text-accent transition-colors"
            title="View product"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
