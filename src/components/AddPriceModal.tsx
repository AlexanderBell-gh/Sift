import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface AddPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (priceData: { price: number; store?: string; date: string }) => void;
}

export function AddPriceModal({ isOpen, onClose, onSave }: AddPriceModalProps) {
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      price: parseFloat(price),
      store: store.trim() || undefined,
      date,
    });
    setPrice('');
    setStore('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Price Entry" className="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="New Price *"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          required
        />

        <Input
          label="Store"
          value={store}
          onChange={(e) => setStore(e.target.value)}
          placeholder="e.g., Walmart, Target"
        />

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Add Price
          </Button>
        </div>
      </form>
    </Modal>
  );
}
