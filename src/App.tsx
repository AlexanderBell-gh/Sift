import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { ProductGrid } from './components/ProductGrid';
import { ProductModal } from './components/ProductModal';
import { AddPriceModal } from './components/AddPriceModal';
import { ProductDetail } from './components/ProductDetail';
import { AddCategoryModal } from './components/AddCategoryModal';
import { api } from './lib/api';
import type { Product, Category } from './types';
import { DEFAULT_CATEGORIES } from './types';
import { formatPrice } from './lib/utils';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Selected items
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

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.store?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort by most recent price
  filteredProducts.sort((a, b) => {
    const aDate = a.prices?.[a.prices.length - 1]?.date || '';
    const bDate = b.prices?.[b.prices.length - 1]?.date || '';
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  // Stats
  const avgPrice =
    filteredProducts.length > 0
      ? filteredProducts.reduce((sum, p) => sum + (p.prices?.[p.prices.length - 1]?.price || 0), 0) /
        filteredProducts.length
      : 0;

  // Handlers
  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
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

  const handleAddPrice = () => {
    setIsDetailOpen(false);
    setIsPriceModalOpen(true);
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

  const handleAddCategory = () => {
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (category: { name: string; icon: string }) => {
    try {
      const newCategory = await api.createCategory(category);
      setCategories([...categories, newCategory]);
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.deleteCategory(categoryId);
      setCategories(categories.filter(c => c.id !== categoryId));
      if (currentCategory === categoryId) {
        setCurrentCategory('all');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddProduct={handleAddProduct}
      />

      <CategoryFilter
        categories={categories}
        activeCategory={currentCategory}
        onCategoryChange={setCurrentCategory}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span>{filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>Avg: {formatPrice(avgPrice)}</span>
          </div>
        </div>

        <ProductGrid
          products={filteredProducts}
          onProductClick={handleProductClick}
          onAddProduct={handleAddProduct}
        />
      </main>

      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          PriceTrackr v1.0.0
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
        onAddPrice={handleAddPrice}
      />

      <AddCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />
    </div>
  );
}

export default App;
