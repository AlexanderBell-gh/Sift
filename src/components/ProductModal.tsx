import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import type { Product, Category, ProductAnalysis } from '../types';
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

interface ImageResult {
  title: string;
  imageUrl: string;
  source: string;
  sourceUrl: string;
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

  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageResults, setImageResults] = useState<ImageResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (url && !store) {
      const detected = detectStoreFromUrl(url);
      if (detected) {
        setStore(detected);
        setIsStoreAutoDetected(true);
      }
    }
  }, [url]);

  useEffect(() => {
    if (isImageSearchOpen && name.trim()) {
      setImageSearchQuery(name.trim());
    }
  }, [isImageSearchOpen, name]);

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

  const searchImages = async () => {
    if (!imageSearchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await api.searchImages(imageSearchQuery.trim());
      setImageResults(response.images || []);
    } catch (err) {
      console.error('Image search failed:', err);
      setImageResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectImage = (img: ImageResult) => {
    setImageUrl(img.imageUrl);
    setIsImageSearchOpen(false);
    setImageResults([]);
  };

  const analyzeProduct = async () => {
    if (!name.trim()) return;
    setIsAnalyzing(true);
    try {
      const result: ProductAnalysis = await api.analyzeProduct(name.trim());
      if (result) {
        if (result.name) setName(result.name);
        if (result.url) setUrl(result.url);
        if (result.price) setPrice(result.price.toString());
        if (result.imageUrl) setImageUrl(result.imageUrl);
        if (result.url) {
          const detected = detectStoreFromUrl(result.url);
          if (detected) {
            setStore(detected);
            setIsStoreAutoDetected(true);
          }
        }
      }
    } catch (err) {
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
           onClick={() => setIsImageSearchOpen(true)}
           className="h-full px-4 whitespace-nowrap"
           title="Find Products"
         >
           <Search className="w-4 h-4" />
         </Button>
         <Button
           type="button"
           onClick={analyzeProduct}
           disabled={isAnalyzing || !name.trim()}
           className="h-full px-4 whitespace-nowrap"
           title="AI Search"
         >
           {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
         </Button>
       </div>

       <Input
         label="Product URL"
         type="url"
         value={url}
         onChange={(e) => setUrl(e.target.value)}
         placeholder="Enter Product URL"
       />

       <div>
        <Input
          label="Image URL"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Once an image is selected a thumbnail will appear below"
        />
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
      </div>

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
          placeholder="Hint: Normal Price £x.xx | Nectar Price £x.xx"
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
        isOpen={isImageSearchOpen}
        onClose={() => { setIsImageSearchOpen(false); setImageResults([]); }}
        title="Find Products"
        className="max-w-2xl"
      >
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={imageSearchQuery}
              onChange={(e) => setImageSearchQuery(e.target.value)}
              placeholder="Search for product images..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchImages();
                }
              }}
            />
            <Button
              onClick={searchImages}
              disabled={isSearching || !imageSearchQuery.trim()}
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : imageResults.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
              {imageResults.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectImage(img)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10 hover:border-green-500 transition-colors group"
                >
                  <img
                    src={img.imageUrl}
                    alt={img.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f4f4f5" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Enter a search term and click the search button</p>
            </div>
          )}

          {imageResults.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Click an image to select it
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