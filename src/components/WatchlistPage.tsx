import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkCheck, ArrowLeft, Trash2, ExternalLink, Tag, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getWatchlist, removeFromWatchlist } from '../lib/api';
import type { WatchlistItem } from '../types';

function formatPrice(value: number | null): string | null {
  if (value === null) return null;
  return `£${value.toFixed(2)}`;
}

export default function WatchlistPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    getWatchlist(token)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, navigate]);

  async function handleRemove(id: string) {
    if (!token) return;
    try {
      await removeFromWatchlist(token, id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
      // silent
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Nav */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-xl font-bold gradient-text">Watchlist</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <BookmarkCheck className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">No pinned products</p>
            <p className="text-gray-500 text-sm mt-1">Search and pin products to track them here</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-accent-light transition-colors"
            >
              Search Products
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const normalPrice = formatPrice(item.prices.normal);
              const loyaltyPrice = formatPrice(item.prices.loyalty);
              const unitPrice = formatPrice(item.prices.unit_price);
              const offerExpired = item.offer_expires_at ? new Date(item.offer_expires_at) < new Date() : false;

              return (
                <div key={item.id} className="product-card group relative animate-fade-in-up">
                  {item.is_on_offer && !offerExpired && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/90 text-white shadow-lg">
                        <Tag className="w-3 h-3" />
                        ON OFFER
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-black/30 text-white/70 hover:text-red-400 hover:bg-black/50 backdrop-blur-sm transition-colors"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="product-image">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} loading="lazy" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-medium">
                          {item.store.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </a>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {item.store_logo && (
                        <img src={item.store_logo} alt={item.store} className="w-5 h-5 rounded-full object-contain" />
                      )}
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{item.store}</span>
                    </div>

                    <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                      <h3 className="font-medium text-white leading-snug line-clamp-2 hover:text-accent transition-colors">
                        {item.product_name}
                      </h3>
                    </a>

                    {item.unit && <p className="text-xs text-zinc-500">{item.unit}</p>}

                    <div className="flex items-baseline gap-3">
                      {normalPrice && <span className="price-display text-white">{normalPrice}</span>}
                      {loyaltyPrice && loyaltyPrice !== normalPrice && (
                        <span className="text-sm font-medium text-emerald-500">{loyaltyPrice}</span>
                      )}
                      {unitPrice && (
                        <span className="text-xs text-zinc-500">({unitPrice}/{item.unit?.replace(/[\d.\s]/g, '') || 'unit'})</span>
                      )}
                    </div>

                    {item.loyalty_type && loyaltyPrice && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {item.loyalty_type}
                        </span>
                        <span className="text-xs text-zinc-500">price</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {item.offer_expires_at && !offerExpired && (
                        <span className="text-[11px] text-amber-500 font-medium">
                          Offer ends {new Date(item.offer_expires_at).toLocaleDateString('en-GB')}
                        </span>
                      )}
                      {offerExpired && <span className="text-[11px] text-zinc-600">Offer expired</span>}
                      <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-zinc-500 hover:text-accent transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="text-[10px] text-zinc-600 pt-1 border-t border-white/5">
                      Pinned {new Date(item.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
