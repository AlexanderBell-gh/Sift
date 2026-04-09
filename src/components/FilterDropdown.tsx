import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { Category } from '../types';

interface FilterDropdownProps {
  categories: Category[];
  selectedCategories: string[];
  selectedStores: string[];
  onCategoriesChange: (categories: string[]) => void;
  onStoresChange: (stores: string[]) => void;
}

const ALL_STORES = [
  "Sainsbury's",
  'Tesco',
  'Morrisons',
  'ASDA',
  'M&S',
  'Waitrose',
  'Ocado',
  'Aldi',
  'Lidl',
  'Iceland',
  'Co-op',
];

export function FilterDropdown({
  categories,
  selectedCategories,
  selectedStores,
  onCategoriesChange,
  onStoresChange,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalFilters = selectedCategories.length + selectedStores.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== categoryId));
    } else {
      onCategoriesChange([...selectedCategories, categoryId]);
    }
  };

  const toggleStore = (store: string) => {
    if (selectedStores.includes(store)) {
      onStoresChange(selectedStores.filter((s) => s !== store));
    } else {
      onStoresChange([...selectedStores, store]);
    }
  };

  const clearAll = () => {
    onCategoriesChange([]);
    onStoresChange([]);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-white/10 bg-transparent hover:bg-zinc-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-500/40 text-sm transition-all"
      >
        <span className="text-zinc-600 dark:text-zinc-300">Filter</span>
        {totalFilters > 0 && (
          <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums">
            {totalFilters}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 rounded-xl shadow-[0_16px_32px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.4)] animate-slide-up">
          <div className="p-2 border-b border-zinc-200/80 dark:border-white/10">
            <button
              onClick={clearAll}
              className="text-sm text-green-500 hover:text-green-400 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          </div>

          <div className="p-2 max-h-72 overflow-y-auto price-log">
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1.5">
                Categories
              </p>
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2.5 py-2 px-2 hover:bg-zinc-50 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="rounded border-zinc-300 dark:border-zinc-600 text-green-500 focus:ring-green-500/40 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-200">{category.name}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1.5">
                Stores
              </p>
              {ALL_STORES.map((store) => (
                <label
                  key={store}
                  className="flex items-center gap-2.5 py-2 px-2 hover:bg-zinc-50 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedStores.includes(store)}
                    onChange={() => toggleStore(store)}
                    className="rounded border-zinc-300 dark:border-zinc-600 text-green-500 focus:ring-green-500/40 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-200">{store}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
