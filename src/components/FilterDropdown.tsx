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
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
      >
        <span>Filter by</span>
        {totalFilters > 0 && (
          <span className="bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full text-xs">
            {totalFilters}
          </span>
        )}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg">
          <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
            <button
              onClick={clearAll}
              className="text-sm text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          </div>

          <div className="p-2 max-h-64 overflow-y-auto">
            <div className="mb-3">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
                Categories
              </p>
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 py-1.5 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  <span className="text-sm">{category.icon} {category.name}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-2">
                Stores
              </p>
              {ALL_STORES.map((store) => (
                <label
                  key={store}
                  className="flex items-center gap-2 py-1.5 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStores.includes(store)}
                    onChange={() => toggleStore(store)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  <span className="text-sm">{store}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
