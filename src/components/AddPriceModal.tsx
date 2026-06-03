import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface AddPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (priceData: { price: number; date: string }) => void;
}

export function AddPriceModal({ isOpen, onClose, onSave }: AddPriceModalProps) {
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [priceError, setPriceError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceError('');
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setPriceError('Please enter a valid price');
      return;
    }
    
    try {
      await onSave({
        price: numPrice,
        date,
      });
      setPrice('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch {
      // Error handled by parent
    }
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
          onChange={(e) => { setPrice(e.target.value); setPriceError(''); }}
          placeholder="0.00"
          required
          className="text-lg tabular-nums font-semibold"
        />
        {priceError && <p className="text-sm text-red-500">{priceError}</p>}

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="flex gap-2 pt-2">
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
