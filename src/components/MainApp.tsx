import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { ProductGrid } from './ProductGrid';
import { ProductModal } from './ProductModal';
import { AddPriceModal } from './AddPriceModal';
import { ProductDetail } from './ProductDetail';
import { SortSelect, type SortOption } from './SortSelect';
import { FilterDropdown } from './FilterDropdown';
import { useToast } from './ui/useToast';
import { api, UnauthorizedError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { Product, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../types';
import { ScanReceiptModal } from './ScanReceiptModal';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AlertTriangle } from 'lucide-react';

export function MainApp() {
  const navigate = useNavigate();
  const { user, isTrial, isTrialExpired, trialHoursRemaining, signOut, handleUnauthorized } = useAuth();
  const { showToast } = useToast();
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
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  // We only need the ref for the actual ID, the state is used to trigger re-renders for the modal
  const quickAddProductIdRef = useRef<string | null>(null);

  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null);
  const [pendingProductData, setPendingProductData] = useState<{ name: string; url?: string; imageUrl?: string; category: string; price: number; store?: string; notes?: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        handleUnauthorized();
      } else {
        console.error('Failed to load data:', error);
        showToast('Failed to load products. Please refresh the page.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, showToast]);

  useEffect(() => {
    setTimeout(() => {
      loadData();
    }, 0);
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
    if (!editingProduct) {
      const nameMatch = products.find(p => p.name.toLowerCase() === productData.name.toLowerCase());
      const urlMatch = productData.url ? products.find(p => p.url === productData.url) : null;
      const duplicate = nameMatch || urlMatch;

      if (duplicate) {
        setDuplicateProduct(duplicate);
        setPendingProductData(productData);
        setIsDuplicateModalOpen(true);
        return;
      }
    } else {
      // Duplicate check on edit, excluding current product
      const nameMatch = products.find(p => p.id !== editingProduct.id && p.name.toLowerCase() === productData.name.toLowerCase());
      const urlMatch = productData.url ? products.find(p => p.id !== editingProduct.id && p.url === productData.url) : null;
      const duplicate = nameMatch || urlMatch;

      if (duplicate) {
        setDuplicateProduct(duplicate);
        setPendingProductData(productData);
        setIsDuplicateModalOpen(true);
        return;
      }
    }

    try {
      if (editingProduct) {
        const updated = await api.updateProduct(editingProduct.id, productData);
        setProducts(prev => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
        setSelectedProduct(updated);
      } else {
        const newProduct = await api.createProduct(productData);
        setProducts(prev => [...prev, newProduct]);
      }
      setIsProductModalOpen(false);
    } catch (error) {
      console.error('Failed to save product:', error);
      showToast('Failed to save product. Please try again.', 'error');
    }
  };

  const handleEditDuplicate = () => {
    setIsDuplicateModalOpen(false);
    setIsProductModalOpen(false);
    if (duplicateProduct) {
      handleEditProduct(duplicateProduct);
    }
    setDuplicateProduct(null);
    setPendingProductData(null);
  };

  const handleAddDuplicateAnyway = async () => {
    if (!pendingProductData) return;
    setIsDuplicateModalOpen(false);
    try {
      const newProduct = await api.createProduct(pendingProductData);
      setProducts(prev => [...prev, newProduct]);
      showToast('Product added', 'success');
    } catch (error) {
      console.error('Failed to save product:', error);
      showToast('Failed to save product. Please try again.', 'error');
    }
    setDuplicateProduct(null);
    setPendingProductData(null);
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.deleteProduct(selectedProduct.id);
      setProducts(prev => prev.filter((p) => p.id !== selectedProduct.id));
      setIsDetailOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
      showToast('Failed to delete product. Please try again.', 'error');
    }
  };

  const handleSavePrice = async (priceData: { price: number; date: string }) => {
    const productId = quickAddProductIdRef.current;
    
    if (!productId) return;
    
    try {
      const updated = await api.addPrice(productId, priceData);
      
      setProducts(prev => prev.map((p) => (p.id === productId ? updated : p)));
      setSelectedProduct(updated);
      showToast('Price added successfully', 'success');
    } catch (error) {
      console.error('Failed to add price:', error);
      showToast('Failed to add price. Please try again.', 'error');
    } finally {
      setIsPriceModalOpen(false);
      quickAddProductIdRef.current = null;
    }
  };

  const handleDeletePrice = async (priceIndex: number) => {
    if (!selectedProduct) return;
    
    try {
      const updated = await api.deletePrice(selectedProduct.id, priceIndex);
      setProducts(prev => prev.map((p) => (p.id === selectedProduct.id ? updated : p)));
      setSelectedProduct(updated);
      showToast('Price deleted', 'success');
    } catch (error) {
      console.error('Failed to delete price:', error);
      showToast('Failed to delete price. Please try again.', 'error');
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleQuickAddPriceClick = (product: Product) => {
    quickAddProductIdRef.current = product.id;
    setIsPriceModalOpen(true);
  };

  const handleScanSave = async (items: import('../types').ScannedItem[], store: string | null, date: string | null) => {
    try {
      const productsToCreate = items.map((item) => ({
        name: item.name,
        price: item.price,
        store: store || undefined,
        category: item.category || 'other',
        date: date || undefined,
      }));
      const result = await api.batchCreateProducts(productsToCreate);
      setProducts(prev => [...prev, ...result.products]);
      showToast(`Saved ${result.products.length} item${result.products.length !== 1 ? 's' : ''} from receipt`, 'success');
    } catch (error) {
      console.error('Failed to save scanned items:', error);
      showToast('Failed to save items. Try again.', 'error');
    } finally {
      setIsScanModalOpen(false);
    }
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
            <>Free trial • {trialHoursRemaining} hour{trialHoursRemaining !== 1 ? 's' : ''} remaining • <button onClick={async () => { localStorage.setItem('pricetrackr_landing_tab', 'signup'); await signOut(); }} className="underline hover:no-underline font-semibold">Sign up now</button></>
          )}
        </div>
      )}

      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddProduct={handleAddProduct}
        onScanReceipt={() => setIsScanModalOpen(true)}
        user={user}
        onSignOut={handleSignOut}
      />

      <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-900/70 border-b border-zinc-200/50 dark:border-white/10 sticky top-16 z-40">
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
          onQuickAddPrice={handleQuickAddPriceClick}
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
        onClose={() => { setIsPriceModalOpen(false); }}
        onSave={handleSavePrice}
      />

      <ScanReceiptModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onSave={handleScanSave}
        categories={categories}
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
        onDeletePrice={handleDeletePrice}
      />

      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => { setIsDuplicateModalOpen(false); setDuplicateProduct(null); setPendingProductData(null); }}
        title="Duplicate Product Found"
        className="max-w-sm"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <strong>"{duplicateProduct?.name}"</strong> already exists.
              </p>
              {duplicateProduct?.url && pendingProductData?.url && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Same URL detected.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setIsDuplicateModalOpen(false); setDuplicateProduct(null); setPendingProductData(null); }} className="flex-1">
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleEditDuplicate} className="flex-1">
              Edit Existing
            </Button>
            <Button onClick={handleAddDuplicateAnyway} className="flex-1">
              Add Anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
