import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { Category } from '../types';
import { STORES } from '../types';

interface FilterDropdownProps {
  categories: Category[];
  selectedCategories: string[];
  selectedStores: string[];
  onCategoriesChange: (categories: string[]) => void;
  onStoresChange: (stores: string[]) => void;
}

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
        <svg role="img" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M8.895 4H14.5a.5.5 0 01.5.5v.3a.5.5 0 01-.5.5H8.889a2 2 0 01-3.778 0H3.5a.5.5 0 01-.5-.5v-.3a.5.5 0 01.5-.5h1.605a2 2 0 013.79 0zM3 8.852a.5.5 0 01.5-.5h5.608a2 2 0 013.784 0H14.5a.5.5 0 01.5.5v.3a.5.5 0 01-.5.5h-1.608a2 2 0 01-3.784 0H3.5a.5.5 0 01-.5-.5v-.3zM3 13.204a.5.5 0 01.5-.5h1.615a2 2 0 013.77 0H14.5a.5.5 0 01.5.5v.3a.5.5 0 01-.5.5H8.9a2 2 0 01-3.8 0h-1.6a.5.5 0 01-.5-.5v-.3z" fill="currentColor"></path>
        </svg>
        {totalFilters > 0 && (
          <span className="bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums">
            {totalFilters}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute z-[60] mt-2 w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/80 dark:border-white/10 rounded-xl shadow-[0_16px_32px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.4)] animate-slide-up">
          <div className="p-3 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Filters
            </span>
            <button
              onClick={clearAll}
              disabled={totalFilters === 0}
              className="text-xs text-green-500 hover:text-green-400 transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
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
                  className="flex items-center gap-2.5 py-2 px-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 border border-zinc-300 dark:border-zinc-600 rounded peer-checked:bg-green-500 peer-checked:border-green-500 transition-all group-hover:border-green-400/60"></div>
                    <X className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                  </div>
                  <span className="text-sm text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{category.name}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 mb-1.5">
                Stores
              </p>
              {STORES.map((store) => (
                <label
                  key={store}
                  className="flex items-center gap-2.5 py-2 px-2 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store)}
                      onChange={() => toggleStore(store)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 border border-zinc-300 dark:border-zinc-600 rounded peer-checked:bg-green-500 peer-checked:border-green-500 transition-all group-hover:border-green-400/60"></div>
                    <X className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                  </div>
                  <span className="text-sm text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{store}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
