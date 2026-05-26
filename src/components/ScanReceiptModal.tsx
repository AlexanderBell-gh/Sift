import { useState, useRef, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { Camera, Plus, Trash2, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { parseReceiptText } from '../lib/receiptParser';
import type { ScannedItem, Category } from '../types';

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (items: ScannedItem[], store: string | null, date: string | null) => void;
  categories: Category[];
}

type Stage = 'upload' | 'scanning' | 'results' | 'saving';

export function ScanReceiptModal({ isOpen, onClose, onSave, categories }: ScanReceiptModalProps) {
  const [stage, setStage] = useState<Stage>('upload');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [store, setStore] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStage('upload');
    setImageDataUrl(null);
    setImageFile(null);
    setProgress(0);
    setProgressText('');
    setStore('');
    setDate('');
    setItems([]);
    setError(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const startScan = async () => {
    if (!imageFile || !imageDataUrl) return;
    setStage('scanning');
    setProgress(0);
    setProgressText('Initializing OCR...');
    setError(null);

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core') {
            setProgressText('Loading OCR engine...');
            setProgress(10);
          } else if (m.status === 'initializing tesseract') {
            setProgressText('Initializing...');
            setProgress(25);
          } else if (m.status === 'loading language traineddata') {
            setProgressText('Loading language data...');
            setProgress(40);
          } else if (m.status === 'initializing api') {
            setProgressText('Starting OCR...');
            setProgress(60);
          } else if (m.status === 'recognizing text') {
            setProgressText('Recognizing text...');
            const pct = m.progress ?? 0;
            setProgress(60 + Math.round(pct * 35));
          }
        },
      });

      setProgressText('Running OCR on receipt...');
      const { data } = await worker.recognize(imageFile);
      setProgress(100);
      setProgressText('Parsing results...');

      const parsed = parseReceiptText(data.text);
      setStore(parsed.store || '');
      setDate(parsed.date || '');
      setItems(parsed.items.length > 0 ? parsed.items : [{ name: '', price: 0 }]);
      setStage('results');
    } catch (err) {
      console.error('OCR failed:', err);
      setError('Failed to scan receipt. Try again or enter items manually.');
      setStage('upload');
    } finally {
      if (worker) await worker.terminate();
    }
  };

  const updateItem = (index: number, field: keyof ScannedItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems(prev => [...prev, { name: '', price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const validItems = items.filter(item => item.name.trim().length > 0 && item.price > 0);
    if (validItems.length === 0) {
      setError('Add at least one item with a name and price');
      return;
    }
    setStage('saving');
    onSave(validItems, store || null, date || null);
  };

  const handleResetImage = () => {
    setImageDataUrl(null);
    setImageFile(null);
    setStage('upload');
    setError(null);
  };

  const renderUpload = () => (
    <div className="p-6 space-y-4">
      {imageDataUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10">
          <img src={imageDataUrl} alt="Receipt" className="w-full max-h-56 object-contain bg-zinc-100 dark:bg-zinc-800" />
          <button
            onClick={() => { setImageDataUrl(null); setImageFile(null); setError(null); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 dark:hover:border-green-500/60 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-green-500/10">
              <Camera className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Take or upload a receipt photo
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Tap to select or drag image here
              </p>
            </div>
          </div>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
      <div className="flex gap-2 pt-2">
        <Button variant="secondary" onClick={handleClose} className="flex-1">
          Cancel
        </Button>
        {imageDataUrl && (
          <Button onClick={startScan} className="flex-1">
            Scan Receipt
          </Button>
        )}
      </div>
    </div>
  );

  const renderScanning = () => (
    <div className="p-6 space-y-6">
      {imageDataUrl && (
        <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10">
          <img src={imageDataUrl} alt="Receipt" className="w-full max-h-48 object-contain bg-zinc-100 dark:bg-zinc-800" />
        </div>
      )}
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {progressText}
        </p>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400">{progress}%</p>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="px-6 py-4 space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Store"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="Auto-detected store"
          />
        </div>
        <div className="w-40">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Items ({items.length})
          </p>
          <button
            onClick={addItem}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-zinc-400 hover:text-green-500"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(i, 'name', e.target.value)}
                placeholder="Product name"
                className="w-full px-2 py-1 text-sm bg-transparent border border-transparent focus:border-green-400 dark:focus:border-green-500/60 rounded focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>
            <div className="w-24">
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.price || ''}
                onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-2 py-1 text-sm text-right tabular-nums bg-transparent border border-transparent focus:border-green-400 dark:focus:border-green-500/60 rounded focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>
            <select
              value={item.category || ''}
              onChange={(e) => updateItem(i, 'category', e.target.value)}
              className="text-xs px-1.5 py-1 rounded bg-transparent border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 focus:outline-none focus:border-green-400"
            >
              <option value="">Cat...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
            <button
              onClick={() => removeItem(i)}
              className="p-1 rounded hover:bg-red-500/10 transition-colors text-zinc-400 hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {items.length > 0 && items.some(i => i.price > 0) && (
        <div className="text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300 border-t border-zinc-200/50 dark:border-white/10 pt-2">
          Total: £{items.reduce((sum, i) => sum + i.price, 0).toFixed(2)}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="secondary" onClick={handleResetImage} className="flex-1">
          New Scan
        </Button>
        <Button onClick={handleSave} disabled={items.length === 0} className="flex-1">
          Save All Items
        </Button>
      </div>
    </div>
  );

  const renderSaving = () => (
    <div className="p-6 flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Saving items...
      </p>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={stage === 'saving' ? () => {} : handleClose} title="Scan Receipt" className="max-w-lg">
      {stage === 'upload' && renderUpload()}
      {stage === 'scanning' && renderScanning()}
      {stage === 'results' && renderResults()}
      {stage === 'saving' && renderSaving()}
    </Modal>
  );
}
