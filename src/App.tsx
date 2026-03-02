import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CategoryFilter } from './components/CategoryFilter';
import { ProductGrid } from './components/ProductGrid';
import { ProductModal } from './components/ProductModal';
import { AddPriceModal } from './components/AddPriceModal';
import { ProductDetail } from './components/ProductDetail';
import { AddCategoryModal } from './components/AddCategoryModal';
import { SortSelect } from './components/SortSelect';
import { api } from './lib/api';
import type { Product, Category } from './types';
import { DEFAULT_CATEGORIES } from './types';

type SortOption = 'newest' | 'oldest' | 'store' | 'name-asc' | 'price-low' | 'price-high';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
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

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const getCurrentPrice = (p: Product) => p.prices?.[p.prices.length - 1]?.price || 0;
    const getStoreName = (p: Product) => p.store?.toLowerCase() || '';

    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'store':
        return getStoreName(a).localeCompare(getStoreName(b));
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

  // Handlers
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
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddProduct={handleAddProduct}
        onAddCategory={handleAddCategory}
      />

      <CategoryFilter
        categories={categories}
        activeCategory={currentCategory}
        onCategoryChange={setCurrentCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          <span>{sortedProducts.length} Product{sortedProducts.length !== 1 ? 's' : ''}</span>
          <SortSelect value={sortBy} onChange={setSortBy} />
        </div>

        <ProductGrid
          products={sortedProducts}
          onProductClick={handleProductClick}
          onAddProduct={handleAddProduct}
        />
      </main>

      <footer className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-zinc-500">
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
