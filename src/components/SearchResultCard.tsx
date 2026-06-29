import { ExternalLink, Clock, Tag } from 'lucide-react';
import type { SearchResult } from '../types';

interface Props {
  result: SearchResult;
}

export default function SearchResultCard({ result }: Props) {
  const { name, store, store_logo, image_url, unit, prices, loyalty_type, offer_expires_at, product_url, is_on_offer } = result;

  const formatPrice = (price: number | null) => {
    if (price === null) return null;
    return `£${price.toFixed(2)}`;
  };

  const normalPrice = formatPrice(prices.normal);
  const loyaltyPrice = formatPrice(prices.loyalty);
  const unitPrice = prices.unit_price ? `£${prices.unit_price.toFixed(2)}/unit` : null;

  const isExpired = offer_expires_at && new Date(offer_expires_at) < new Date();

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden backdrop-blur-sm hover:border-emerald-500/50 transition-colors">
      {/* Image */}
      <div className="relative h-40 bg-gray-900">
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🛒</span>
          </div>
        )}
        {is_on_offer && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-orange-500 rounded text-xs font-medium text-white">
            ON OFFER
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Store */}
        <div className="flex items-center gap-2 mb-2">
          {store_logo && (
            <img src={store_logo} alt={store} className="w-5 h-5 object-contain" />
          )}
          <span className="text-sm text-gray-400">{store}</span>
        </div>

        {/* Name */}
        <h3 className="text-white font-medium mb-2 line-clamp-2">{name}</h3>

        {/* Unit */}
        {unit && (
          <p className="text-xs text-gray-500 mb-2">{unit}</p>
        )}

        {/* Prices */}
        <div className="space-y-1 mb-3">
          {normalPrice && (
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${loyaltyPrice ? 'text-gray-500 line-through' : 'text-white'}`}>
                {normalPrice}
              </span>
              {loyaltyPrice && (
                <span className="text-lg font-bold text-emerald-400">
                  {loyaltyPrice}
                </span>
              )}
            </div>
          )}
          {!normalPrice && loyaltyPrice && (
            <span className="text-lg font-bold text-emerald-400">{loyaltyPrice}</span>
          )}
          {unitPrice && (
            <p className="text-xs text-gray-500">{unitPrice}</p>
          )}
        </div>

        {/* Loyalty Type */}
        {loyalty_type && (
          <div className="flex items-center gap-1 mb-2">
            <Tag className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-emerald-400">{loyalty_type}</span>
          </div>
        )}

        {/* Expiry */}
        {offer_expires_at && (
          <div className={`flex items-center gap-1 mb-3 ${isExpired ? 'text-red-400' : 'text-yellow-400'}`}>
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {isExpired ? 'Expired' : `Expires ${new Date(offer_expires_at).toLocaleDateString('en-GB')}`}
            </span>
          </div>
        )}

        {/* Link */}
        {product_url && (
          <a
            href={product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View product</span>
          </a>
        )}
      </div>
    </div>
  );
}
