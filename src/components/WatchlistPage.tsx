import { useState, useEffect } from 'react';
import { BookmarkCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, removeFromWatchlist } from '../lib/api';
import type { WatchlistItem } from '../types';
import SearchResultCard from './SearchResultCard';
import NavHeader from './NavHeader';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

export default function WatchlistPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    getWatchlist(token)
      .then(setItems)
      .catch(() => showToast('Failed to load watchlist', 'error'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  async function handleRemove(id: string) {
    if (!token) return;
    try {
      await removeFromWatchlist(token, id);
      setItems(prev => prev.filter(i => i.id !== id));
      showToast('Removed from watchlist', 'info');
    } catch {
      showToast('Failed to remove item', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A]">
      <NavHeader title="Watchlist" showBack />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="product-card animate-pulse">
                <div className="skeleton h-44 rounded-t-2xl" />
                <div className="p-4 space-y-3">
                  <div className="skeleton h-3 w-16 rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-12 rounded" />
                  <div className="skeleton h-6 w-20 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <BookmarkCheck className="w-16 h-16 text-zinc-300 dark:text-gray-600 mb-4" />
            <p className="text-zinc-600 dark:text-gray-400 text-lg">No pinned products</p>
            <p className="text-zinc-400 dark:text-gray-500 text-sm mt-1">Search and pin products to track them here</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-accent text-black font-medium rounded-xl hover:bg-accent-light transition-colors"
            >
              Search Products
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <SearchResultCard
                key={item.id}
                result={{
                  id: item.product_id,
                  name: item.product_name,
                  store: item.store,
                  store_logo: item.store_logo,
                  image_url: item.image_url,
                  unit: item.unit,
                  prices: item.prices,
                  loyalty_type: item.loyalty_type,
                  offer_expires_at: item.offer_expires_at,
                  product_url: item.product_url,
                  is_on_offer: item.is_on_offer,
                }}
                showRemove
                onRemove={() => handleRemove(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
