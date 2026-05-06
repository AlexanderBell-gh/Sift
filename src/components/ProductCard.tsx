import type { Product } from '../types';
import { CATEGORY_ICONS, STORE_FAVICONS } from '../types';
import { formatPrice, formatDate, calculatePriceChange } from '../lib/utils';
import { Badge } from './ui/Badge';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onQuickAddPrice: () => void;
  index?: number;
}

export function ProductCard({ product, onClick, onQuickAddPrice, index = 0 }: ProductCardProps) {
  const latestPrice = product.prices?.[product.prices.length - 1];
  const currentPrice = latestPrice?.price || 0;
  const { change, percent, direction } = calculatePriceChange(product.prices || []);

  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
  const icon = CATEGORY_ICONS[product.category] || '📦';
  const pillClass = direction === 'up' ? 'price-pill-up' : direction === 'down' ? 'price-pill-down' : 'price-pill-neutral';

  return (
    <div
      onClick={onClick}
      className="product-card cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="product-image">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `<span class="text-5xl">${icon}</span>`;
            }}
          />
        ) : (
          <span className="text-5xl">{icon}</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="font-semibold text-base tracking-tight truncate flex-1">{product.name}</h3>
        </div>
        {product.store && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
            {STORE_FAVICONS[product.store] ? (
              <img 
                src={STORE_FAVICONS[product.store]} 
                alt={product.store}
                className="w-5 h-5 rounded object-contain bg-white dark:bg-zinc-100 p-0.5" 
              />
            ) : (
              <span className="text-[10px]">🏪</span>
            )}
            {product.store}
          </p>
        )}

        <div className="flex items-end justify-between mb-3">
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAddPrice(); }}
            className="flex items-center gap-1.5 cursor-pointer group"
            title="Add price"
          >
            <p className="price-display group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors">{formatPrice(currentPrice)}</p>
            <Plus className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-green-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
          </button>
          <div className="text-right">
            <span className={`price-change-pill ${pillClass}`}>
              {arrow} {formatPrice(Math.abs(change))}
              {direction !== 'neutral' && <span className="opacity-70">({percent}%)</span>}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge category={product.category} />
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{latestPrice ? formatDate(latestPrice.date) : 'No prices'}</span>
        </div>
      </div>
    </div>
  );
}
