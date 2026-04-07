import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Package } from 'lucide-react';
import { Button } from './ui/Button';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddProduct: () => void;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/50 overflow-hidden">
      <div className="w-full h-44 bg-zinc-100 dark:bg-zinc-800/50" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton w-3/4" />
        <div className="h-3 skeleton w-1/3" />
        <div className="flex justify-between">
          <div className="h-7 skeleton w-20" />
          <div className="h-5 skeleton w-16" />
        </div>
        <div className="flex justify-between">
          <div className="h-6 skeleton w-24" />
          <div className="h-4 skeleton w-16" />
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ products, onProductClick, onAddProduct, isLoading }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center mb-6">
          <Package className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight mb-2">No products yet</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm text-sm">
          Start tracking your grocery prices by adding your first product.
        </p>
        <Button onClick={onAddProduct} className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          Add Your First Product
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick(product)}
          index={index}
        />
      ))}
    </div>
  );
}
