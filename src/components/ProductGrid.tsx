import type { Product } from '../types';
import { ProductCard } from './ProductCard';
import { Package } from 'lucide-react';
import { Button } from './ui/Button';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddProduct: () => void;
}

export function ProductGrid({ products, onProductClick, onAddProduct }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-32 h-32 mb-6 text-6xl">📦</div>
        <h2 className="text-2xl font-semibold mb-2">No products yet</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
          Start tracking your grocery prices by adding your first product.
        </p>
        <Button onClick={onAddProduct} className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Add Your First Product
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick(product)}
        />
      ))}
    </div>
  );
}
