import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import type { Product } from '../types';
import { formatPrice, formatDate, calculatePriceChange } from '../lib/utils';
import { Pencil, Trash2, ExternalLink, Store, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProductDetailProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function Sparkline({ prices }: { prices: { price: number; date: string }[] }) {
  if (prices.length < 2) return null;

  const values = prices.map(p => p.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 280;
  const height = 60;
  const padding = 4;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const isDown = values[values.length - 1] < values[0];
  const lineColor = isDown ? '#22C55E' : '#EF4444';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${padding},${height - padding} ${points.join(' ')} ${width - padding},${height - padding}`}
        fill="url(#sparklineGradient)"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={parseFloat(points[points.length - 1].split(',')[0])}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r="3"
        fill={lineColor}
      />
    </svg>
  );
}

export function ProductDetail({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ProductDetailProps) {
  if (!product) return null;

  const latestPrice = product.prices?.[product.prices.length - 1];
  const { change, percent, direction } = calculatePriceChange(product.prices || []);

  const changeClass =
    direction === 'up'
      ? 'text-red-500'
      : direction === 'down'
      ? 'text-emerald-500'
      : 'text-zinc-400';

  const TrendIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  const categoryIconMap: Record<string, string> = {
    chilled: '🥛', snacks: '🍿', beverages: '🥤', produce: '🥬',
    frozen: '🧊', bakery: '🥖', pantry: '🥫', condiments: '🧂', other: '📦',
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.4)] border border-zinc-200/80 dark:border-white/10 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-zinc-200/80 dark:border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{categoryIconMap[product.category] || '📦'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight">{product.name}</h2>
                  <div className="mt-1.5">
                    <Badge category={product.category} />
                  </div>
                  {product.url && (
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 mt-2 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Product
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Current Price</p>
                  <p className="text-3xl font-semibold tracking-tight tabular-nums mt-1 gradient-text">{formatPrice(latestPrice?.price || 0)}</p>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Change</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendIcon className={`w-5 h-5 ${changeClass}`} />
                    <p className={`text-xl font-semibold tabular-nums ${changeClass}`}>
                      {direction === 'up' ? `+${formatPrice(change)}` : direction === 'down' ? `-${formatPrice(Math.abs(change))}` : 'No change'}
                    </p>
                  </div>
                  {direction !== 'neutral' && (
                    <p className={`text-xs ${changeClass} opacity-70 mt-0.5`}>{percent}%</p>
                  )}
                </div>
              </div>

              {product.prices && product.prices.length >= 2 && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium mb-2">Price History</p>
                  <Sparkline prices={product.prices} />
                </div>
              )}

              {(product.store || latestPrice?.date) && (
                <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {product.store && (
                    <div className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      <span>{product.store}</span>
                    </div>
                  )}
                  {latestPrice?.date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{formatDate(latestPrice.date)}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-xs uppercase tracking-wider font-medium text-zinc-500 dark:text-zinc-400 mb-2">Notes</h3>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 min-h-[60px]">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {product.notes || 'No notes yet'}
                  </p>
                </div>
              </div>

              {product.prices && product.prices.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-medium text-zinc-500 dark:text-zinc-400 mb-2">Recent Prices</h3>
                  <div className="price-log max-h-40 overflow-y-auto space-y-1.5">
                    {[...product.prices].reverse().slice(0, 10).map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-zinc-50 dark:bg-white/5">
                        <span className="text-zinc-600 dark:text-zinc-300 tabular-nums font-medium">{formatPrice(entry.price)}</span>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          {entry.store && <span>{entry.store}</span>}
                          <span className="tabular-nums">{formatDate(entry.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={onEdit} className="flex-1 flex items-center justify-center gap-2">
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
                <Button variant="danger" onClick={onDelete} className="flex-1 flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
