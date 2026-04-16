import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import type { Product, Category, ProductAnalysis, SearchResult } from '../types';
import { detectStoreFromUrl } from '../lib/utils';
import { api } from '../lib/api';
import { Search, Loader2, Sparkles } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: { name: string; url?: string; imageUrl?: string; category: string; price: number; store?: string; notes?: string }) => void;
  product?: Product | null;
  categories: Category[];
}

function ProductForm({ product, categories, onSubmit, onCancel }: {
  product?: Product | null;
  categories: Category[];
  onSubmit: (data: { name: string; url?: string; imageUrl?: string; category: string; price: number; store?: string; notes?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [url, setUrl] = useState(product?.url || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [category, setCategory] = useState(product?.category || 'other');
  const [price, setPrice] = useState(product?.prices?.[product.prices.length - 1]?.price?.toString() || '');
  const [store, setStore] = useState(product?.store || '');
  const [notes, setNotes] = useState(product?.notes || '');
  const [priceError, setPriceError] = useState('');
  const [isStoreAutoDetected, setIsStoreAutoDetected] = useState(false);

  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [webResults, setWebResults] = useState<SearchResult[]>([]);
  const [isWebSearching, setIsWebSearching] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeImageError, setAnalyzeImageError] = useState('');

  useEffect(() => {
    if (url && !store) {
      const detected = detectStoreFromUrl(url);
      if (detected) {
        setStore(detected);
        setIsStoreAutoDetected(true);
      }
    }
  }, [url]);

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStore(e.target.value);
    setIsStoreAutoDetected(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError('');
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setPriceError('Please enter a valid price');
      return;
    }
    
    onSubmit({
      name: name.trim(),
      url: url.trim(),
      imageUrl: imageUrl.trim(),
      category,
      price: numPrice,
      store: store.trim(),
      notes: notes.trim(),
    });
  };

  const openWebSearch = () => {
    setWebSearchQuery(name.trim());
    setIsWebSearchOpen(true);
  };

  const searchWeb = async () => {
    if (!webSearchQuery.trim()) return;
    setIsWebSearching(true);
    try {
      const data = await api.searchProducts(webSearchQuery.trim());
      setWebResults(data.results || []);
    } catch (err) {
      console.error('Web search failed:', err);
    } finally {
      setIsWebSearching(false);
    }
  };

  const selectWebResult = (result: SearchResult) => {
    setUrl(result.url);
    const detected = detectStoreFromUrl(result.url);
    if (detected) {
      setStore(detected);
      setIsStoreAutoDetected(true);
    }
    setIsWebSearchOpen(false);
    setWebResults([]);
  };

  const analyzeImage = async () => {
    if (!url.trim()) return;
    setIsAnalyzing(true);
    setAnalyzeImageError('');
    try {
      const result: ProductAnalysis = await api.analyzeProduct(url.trim());
      if (result) {
        if (!product && result.name) setName(result.name);
        if (result.price) setPrice(result.price.toString());
        if (result.imageUrl) setImageUrl(result.imageUrl);
        if (!product && result.store) {
          setStore(result.store);
          setIsStoreAutoDetected(true);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI extraction failed';
      setAnalyzeImageError(msg);
      console.error('AI analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const storeOptions = [
    { value: '', label: 'Select a store...' },
    { value: "Sainsbury's", label: "Sainsbury's" },
    { value: 'Tesco', label: 'Tesco' },
    { value: 'Morrisons', label: 'Morrisons' },
    { value: 'ASDA', label: 'ASDA' },
    { value: 'M&S', label: 'M&S' },
    { value: 'Waitrose', label: 'Waitrose' },
    { value: 'Ocado', label: 'Ocado' },
    { value: 'Aldi', label: 'Aldi' },
    { value: 'Lidl', label: 'Lidl' },
    { value: 'Iceland', label: 'Iceland' },
    { value: 'Co-op', label: 'Co-op' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="flex w-full items-end space-x-2">
        <Input
          label="Product Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sainsbury's Jasons Sourdough Bread"
          required
          className="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={openWebSearch}
          disabled={!name.trim()}
          className="h-full px-4 whitespace-nowrap"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex w-full items-end space-x-2">
        <Input
          label="Product URL"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter Product URL"
          className="flex-1"
        />
      </div>

      <div className="flex w-full items-end space-x-2">
        <Input
          label="Image URL"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Click AI Extract to auto-fill"
          className="flex-1"
        />
        <Button
          type="button"
          onClick={analyzeImage}
          disabled={isAnalyzing || (!url.trim() && !imageUrl.trim())}
          className="h-full px-4 whitespace-nowrap"
          title="AI Extract"
        >
          {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </Button>
      </div>
      {analyzeImageError && (
        <p className="text-sm text-red-500">{analyzeImageError}</p>
      )}
      {imageUrl && (
        <div className="mt-2 p-2 bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 rounded-lg inline-block">
          <img 
            src={imageUrl} 
            alt="Preview" 
            className="max-h-24 max-w-full rounded object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categoryOptions}
        />
        <Input
          label="Current Price *"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => { setPrice(e.target.value); setPriceError(''); }}
          placeholder="0.00"
          required
          className="tabular-nums"
        />
      </div>
      {priceError && <p className="text-sm text-red-500">{priceError}</p>}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select
            label="Store"
            value={store}
            onChange={handleStoreChange}
            options={storeOptions}
          />
        </div>
        {isStoreAutoDetected && (
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded-full mb-0.5">
            Auto-detected
          </span>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-transparent border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-400 dark:focus:border-green-400/60 transition-all resize-none"
          placeholder="e.g, Normal Price £x.xx | Nectar Price £x.xx"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Save Product
        </Button>
      </div>

      

      <Modal
        isOpen={isWebSearchOpen}
        onClose={() => { setIsWebSearchOpen(false); setWebResults([]); }}
        title="Search Products"
        className="max-w-2xl"
      >
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={webSearchQuery}
              onChange={(e) => setWebSearchQuery(e.target.value)}
              placeholder="Search for products..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchWeb();
                }
              }}
            />
            <Button
              onClick={searchWeb}
              disabled={isWebSearching || !webSearchQuery.trim()}
            >
              {isWebSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {isWebSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : webResults.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {webResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectWebResult(result)}
                  className="w-full text-left p-3 rounded-lg border border-zinc-200 dark:border-white/10 hover:border-green-500 transition-colors"
                >
                  <p className="font-medium text-sm line-clamp-2">{result.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{result.url}</p>
                  {result.snippet && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 line-clamp-2">{result.snippet}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Enter a search term and click search</p>
            </div>
          )}

          {webResults.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Click a result to select it
            </p>
          )}
        </div>
      </Modal>
    </form>
  );
}

export function ProductModal({ isOpen, onClose, onSave, product, categories }: ProductModalProps) {
  const formKey = product?.id || 'new';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add Product'}
      className="max-w-lg"
    >
      <ProductForm
        key={formKey}
        product={product}
        categories={categories}
        onSubmit={onSave}
        onCancel={onClose}
      />
    </Modal>
  );
}