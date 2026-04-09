import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import type { Product, Category } from '../types';
import { detectStoreFromUrl } from '../lib/utils';
import { api } from '../lib/api';
import { Loader2, Sparkle } from 'lucide-react';

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
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

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

  const handleFetch = async () => {
    if (!url.trim()) {
      setFetchError('Please enter a product URL first');
      return;
    }

    setFetchError('');
    setIsFetching(true);

    try {
      const data = await api.fetchProductFromUrl(url.trim());
      
      if (data.name) setName(data.name);
      if (data.price) setPrice(data.price.toString());
      if (data.imageUrl) setImageUrl(data.imageUrl);
      if (data.store) {
        setStore(data.store);
        setIsStoreAutoDetected(true);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch product');
    } finally {
      setIsFetching(false);
    }
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
           placeholder="e.g., Jasons Sourdough Bread"
           required
           className="flex-1"
         />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (name.trim()) {
                const searchQuery = encodeURIComponent(name.trim());
                window.open(`https://www.google.com/search?tbm=isch&q=${searchQuery}`, '_blank');
              } else {
                alert('Please enter a product name to search for images');
              }
            }}
            className="h-full px-4 whitespace-nowrap"
            title="Search Google Images"
          >
            Search Images
          </Button>
       </div>

      <div className="flex items-end gap-2">
        <Input
          label="Product URL"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste product page URL"
          className="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleFetch}
          disabled={isFetching}
          className="h-full px-3 whitespace-nowrap"
          title="Fetch product details automatically"
        >
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkle className="w-4 h-4" />}
        </Button>
      </div>
      {fetchError && (
        <p className="text-xs text-red-500 mt-1">{fetchError}</p>
      )}

      <div>
        <Input
          label="Image URL"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Right-click image → Copy image address → Paste here"
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
          placeholder="Optional notes..."
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
