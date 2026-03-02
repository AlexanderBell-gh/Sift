import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import type { Product } from '../types';
import { formatPrice, calculatePriceChange } from '../lib/utils';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';

interface ProductDetailProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
  const { change, direction } = calculatePriceChange(product.prices || []);

  const changeClass =
    direction === 'up'
      ? 'text-red-500'
      : direction === 'down'
      ? 'text-green-500'
      : 'text-zinc-400';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-4xl overflow-hidden">
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
                    <span>
                      {product.category === 'dairy'
                        ? '🥛'
                        : product.category === 'snacks'
                        ? '🍿'
                        : product.category === 'beverages'
                        ? '🥤'
                        : product.category === 'produce'
                        ? '🥬'
                        : product.category === 'meat'
                        ? '🥩'
                        : product.category === 'frozen'
                        ? '🧊'
                        : product.category === 'bakery'
                        ? '🥖'
                        : '📦'}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{product.name}</h2>
                  <Badge category={product.category} />
                  {product.url && (
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-sky-500 hover:underline mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Product
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Current Price</p>
                  <p className="text-3xl font-bold">{formatPrice(latestPrice?.price || 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Change</p>
                  <p className={`text-xl font-semibold ${changeClass}`}>
                    {direction === 'up' && `↑ ${formatPrice(change)}`}
                    {direction === 'down' && `↓ ${formatPrice(Math.abs(change))}`}
                    {direction === 'neutral' && '→ No change'}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Notes</h3>
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl min-h-[80px]">
                  <p className="text-zinc-600 dark:text-zinc-300">
                    {product.notes || 'No notes yet'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={onEdit} className="flex-1 flex items-center justify-center gap-2">
                  <Pencil className="w-5 h-5" />
                  Edit
                </Button>
                <Button variant="danger" onClick={onDelete} className="flex-1 flex items-center justify-center gap-2">
                  <Trash2 className="w-5 h-5" />
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
