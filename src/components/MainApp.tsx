import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { ProductGrid } from './ProductGrid';
import { ProductModal } from './ProductModal';
import { AddPriceModal } from './AddPriceModal';
import { ProductDetail } from './ProductDetail';
import { SortSelect, type SortOption } from './SortSelect';
import { FilterDropdown } from './FilterDropdown';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Product, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../types';

export function MainApp() {
  const navigate = useNavigate();
  const { user, isTrial, isTrialExpired, trialHoursRemaining, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isLoading, setIsLoading] = useState(true);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
    const matchesStore = selectedStores.length === 0 || (product.store && selectedStores.includes(product.store));
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.store?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStore && matchesSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const getCurrentPrice = (p: Product) => p.prices?.[p.prices.length - 1]?.price || 0;

    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name-asc':
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      case 'price-low':
        return getCurrentPrice(a) - getCurrentPrice(b);
      case 'price-high':
        return getCurrentPrice(b) - getCurrentPrice(a);
      default:
        return 0;
    }
  });

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setIsDetailOpen(false);
    setSelectedProduct(null);
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (productData: { name: string; url?: string; imageUrl?: string; category: string; price: number; store?: string; notes?: string }) => {
    try {
      if (editingProduct) {
        const updated = await api.updateProduct(editingProduct.id, productData);
        setProducts(products.map((p) => (p.id === editingProduct.id ? updated : p)));
        setSelectedProduct(updated);
      } else {
        const newProduct = await api.createProduct(productData);
        setProducts([...products, newProduct]);
      }
      setIsProductModalOpen(false);
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(selectedProduct.id);
      setProducts(products.filter((p) => p.id !== selectedProduct.id));
      setIsDetailOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleSavePrice = async (priceData: { price: number; store?: string; date: string }) => {
    if (!selectedProduct) return;
    try {
      const updated = await api.addPrice(selectedProduct.id, priceData);
      setProducts(products.map((p) => (p.id === selectedProduct.id ? updated : p)));
      setSelectedProduct(updated);
      setIsPriceModalOpen(false);
    } catch (error) {
      console.error('Failed to add price:', error);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] text-zinc-800 dark:text-zinc-100 relative">
      {isTrial && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-2 px-4 text-sm font-medium relative z-50">
          {isTrialExpired ? (
            'Your trial has expired. Sign up to continue using PriceTrackr.'
          ) : (
            <>Free trial • {trialHoursRemaining} hour{trialHoursRemaining !== 1 ? 's' : ''} remaining • <button onClick={() => { signOut(); navigate('/'); }} className="underline hover:no-underline font-semibold">Sign up now</button></>
          )}
        </div>
      )}

      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddProduct={handleAddProduct}
        user={user}
        onSignOut={handleSignOut}
      />

      <div className="glass border-b border-zinc-200/50 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center gap-3">
            <FilterDropdown
              categories={categories}
              selectedCategories={selectedCategories}
              selectedStores={selectedStores}
              onCategoriesChange={setSelectedCategories}
              onStoresChange={setSelectedStores}
            />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-start mb-6">
          <SortSelect value={sortBy} onChange={setSortBy} />
        </div>

        <ProductGrid
          products={sortedProducts}
          onProductClick={handleProductClick}
          onAddProduct={handleAddProduct}
          isLoading={isLoading}
        />
      </main>

      <footer className="border-t border-zinc-200/80 dark:border-white/10 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
          PriceTrackr
        </div>
      </footer>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        categories={categories}
      />

      <AddPriceModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        onSave={handleSavePrice}
      />

      <ProductDetail
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={() => {
          if (selectedProduct) {
            handleEditProduct(selectedProduct);
          }
        }}
        onDelete={handleDeleteProduct}
      />
    </div>
  );
}
