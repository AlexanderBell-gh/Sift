import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: { name: string; icon: string }) => void;
}

export function AddCategoryModal({ isOpen, onClose, onSave }: AddCategoryModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon: '📦' });
    setName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Category" className="max-w-sm">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Dairy"
          required
        />

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1">
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
