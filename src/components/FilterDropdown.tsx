import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

const STORES = ['Tesco', "Sainsbury's", 'ASDA', 'Morrisons', 'M&S', 'Aldi', 'Lidl'];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'store_asc', label: 'Store A-Z' },
] as const;

interface Props {
  selectedStores: string[];
  onStoresChange: (stores: string[]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export default function FilterDropdown({ selectedStores, onStoresChange, sortBy, onSortChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allSelected = selectedStores.length === STORES.length;
  const filteredCount = selectedStores.length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleStore(store: string) {
    if (selectedStores.includes(store)) {
      onStoresChange(selectedStores.filter(s => s !== store));
    } else {
      onStoresChange([...selectedStores, store]);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
          'bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10',
          'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10',
          open && 'ring-2 ring-emerald-500 border-transparent'
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {filteredCount < STORES.length && (
          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded text-xs">
            {filteredCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Store Filters */}
          <div className="p-3 border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Stores</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onStoresChange(STORES)}
                  className={cn(
                    'text-xs transition-colors',
                    allSelected ? 'text-zinc-400' : 'text-emerald-500 hover:text-emerald-400'
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => onStoresChange([])}
                  className={cn(
                    'text-xs transition-colors',
                    filteredCount === 0 ? 'text-zinc-400' : 'text-emerald-500 hover:text-emerald-400'
                  )}
                >
                  None
                </button>
              </div>
            </div>
            <div className="space-y-0.5">
              {STORES.map(store => (
                <label
                  key={store}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedStores.includes(store)}
                    onChange={() => toggleStore(store)}
                    className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{store}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="p-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">Sort by</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full appearance-none bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 pr-8 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
