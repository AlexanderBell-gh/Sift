import type { Product } from '../types';
import { formatPrice, formatDate, calculatePriceChange } from '../lib/utils';
import { Badge } from './ui/Badge';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  index?: number;
}

const categoryIcons: Record<string, string> = {
  chilled: '🥛',
  snacks: '🍿',
  beverages: '🥤',
  produce: '🥬',
  frozen: '🧊',
  bakery: '🥖',
  pantry: '🥫',
  condiments: '🧂',
  other: '📦',
};

const storeFavicons: Record<string, string> = {
  "Sainsbury's": '/storeicon_sainsburys.png',
  'Tesco': '/storeicon_tesco.png',
  'Morrisons': '/storeicon_morrisons.png',
  'ASDA': '/storeicon_asda.png',
  'M&S': '/storeicon_mands.png',
  'Waitrose': '/storeicon_waitrose.png',
  'Ocado': '/storeicon_ocado.png',
  'Aldi': '/storeicon_aldi.png',
  'Lidl': '/storeicon_lidl.png',
  'Iceland': '/storeicon_iceland.png',
  'Co-op': '/storeicon_co-op.png',
};

export function ProductCard({ product, onClick, index = 0 }: ProductCardProps) {
  const latestPrice = product.prices?.[product.prices.length - 1];
  const currentPrice = latestPrice?.price || 0;
  const { change, percent, direction } = calculatePriceChange(product.prices || []);

  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
  const icon = categoryIcons[product.category] || '📦';
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
            {storeFavicons[product.store] ? (
              <img 
                src={storeFavicons[product.store]} 
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
          <p className="price-display">{formatPrice(currentPrice)}</p>
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
