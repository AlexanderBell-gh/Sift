import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Loader2 } from 'lucide-react';
import type { Product, Category } from '../types';
import { api } from '../lib/api';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: { name: string; url?: string; imageUrl?: string; category: string; price: number; store?: string; notes?: string }) => void;
  product?: Product | null;
  categories: Category[];
}

export function ProductModal({ isOpen, onClose, onSave, product, categories }: ProductModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('other');
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [notes, setNotes] = useState('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setUrl(product.url || '');
      setImageUrl(product.imageUrl || '');
      setCategory(product.category);
      setPrice(product.prices?.[product.prices.length - 1]?.price?.toString() || '');
      setStore(product.store || '');
      setNotes(product.notes || '');
    } else {
      setName('');
      setUrl('');
      setImageUrl('');
      setCategory('other');
      setPrice('');
      setStore('');
      setNotes('');
    }
    setFetchError('');
    setIsFetchingPrice(false);
  }, [product, isOpen]);

  const handleFetchPrice = async () => {
    if (!url.trim()) {
      setFetchError('Enter a URL first');
      return;
    }
    setIsFetchingPrice(true);
    setFetchError('');
    try {
      const fetchedPrice = await api.fetchPriceFromUrl(url.trim());
      if (fetchedPrice !== null) {
        setPrice(fetchedPrice.toFixed(2));
      } else {
        setFetchError('Could not fetch price automatically');
      }
    } catch (e) {
      setFetchError('Failed to fetch price');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      url: url.trim(),
      imageUrl: imageUrl.trim(),
      category,
      price: parseFloat(price),
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add Product'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Product Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Gallon of Milk"
          required
        />

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Product URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tesco.com/..."
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleFetchPrice}
            disabled={isFetchingPrice || !url.trim()}
            className="mt-6"
          >
            {isFetchingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch Price'}
          </Button>
        </div>
        {fetchError && <p className="text-xs text-red-500 -mt-2">{fetchError}</p>}

        <Input
          label="Image URL"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
        />

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
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <Select
          label="Store"
          value={store}
          onChange={(e) => setStore(e.target.value)}
          options={storeOptions}
        />

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Save Product
          </Button>
        </div>
      </form>
    </Modal>
  );
}
