import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import type { Product, Category } from '../types';
import { detectStoreFromUrl } from '../lib/utils';

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

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: `${c.icon} ${c.name}`,
  }));

  const storeOptions = [
    { value: '', label: 'Select a store...' },
    { value: "Sainsbury's", label: "Sainsbury's" },
    { value: 'Tesco', label: 'Tesco' },
    { value: 'Morrisons', label: 'Morrisons' },
    { value: 'ASDA', label: 'ASDA' },
    { value: 'M&S', label: 'M&S' },
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

      <div>
        <Input
          label="Product URL"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Right-click image → Copy link address → Paste here"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Get this from the store product page
        </p>
      </div>

      <div>
        <Input
          label="Image URL"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Right-click image → Copy image address → Paste here"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Direct link to the image file
        </p>
        {imageUrl && (
          <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg inline-block">
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
        />
        {priceError && <p className="text-sm text-red-600 mt-1">{priceError}</p>}
      </div>

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
          <span className="text-xs bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-2 py-1 rounded mb-0.5">
            Auto-detected
          </span>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="Optional notes..."
        />
      </div>

      <div className="flex gap-3 pt-4">
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
