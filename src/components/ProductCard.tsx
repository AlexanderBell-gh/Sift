import type { Product } from '../types';
import { formatPrice, formatDate, calculatePriceChange, getCategoryBadgeClass } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const categoryIcons: Record<string, string> = {
  dairy: '🥛',
  snacks: '🍿',
  beverages: '🥤',
  produce: '🥬',
  meat: '🥩',
  frozen: '🧊',
  other: '📦',
};

export function ProductCard({ product, onClick }: ProductCardProps) {
  const latestPrice = product.prices?.[product.prices.length - 1];
  const currentPrice = latestPrice?.price || 0;
  const { change, percent, direction } = calculatePriceChange(product.prices || []);

  const priceClass = direction === 'up' ? 'text-red-500' : direction === 'down' ? 'text-green-500' : 'text-zinc-400';
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
  const icon = categoryIcons[product.category] || '📦';

  return (
    <div
      onClick={onClick}
      className="product-card cursor-pointer"
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
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg truncate flex-1">{product.name}</h3>
          <span className={`${getCategoryBadgeClass(product.category)} ml-2`}>{icon}</span>
        </div>
        {product.store && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">🏪 {product.store}</p>
        )}

        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold">{formatPrice(currentPrice)}</p>
          </div>
          <div className="text-right">
            {direction !== 'neutral' ? (
              <p className={`${priceClass} font-semibold text-sm`}>
                {arrow} {formatPrice(Math.abs(change))} ({percent}%)
              </p>
            ) : (
              <p className="text-zinc-400 text-sm">→ No change</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{product.prices?.length || 0} price{(product.prices?.length || 0) !== 1 ? 's' : ''}</span>
          <span>{latestPrice ? formatDate(latestPrice.date) : 'No prices'}</span>
        </div>
      </div>
    </div>
  );
}
