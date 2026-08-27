import { useState, useRef, useEffect } from 'react';
import { Store, LayoutGrid, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { STORES } from '../lib/stores';
import FilterTrigger from './filters/FilterTrigger';
import FilterPanel from './filters/FilterPanel';
import FilterOption from './filters/FilterOption';

const STORE_NAMES = STORES.map(s => s.name);
const CATEGORIES = ['Chilled', 'Snacks', 'Beverages', 'Produce', 'Frozen', 'Bakery', 'Food Cupboard', 'Other'];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'store_asc', label: 'Store A-Z' },
] as const;

interface WatchlistFiltersProps {
  selectedStores: string[];
  onStoresChange: (stores: string[]) => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

type PanelKey = 'stores' | 'categories' | 'sort' | null;

export default function WatchlistFilters({
  selectedStores,
  onStoresChange,
  selectedCategories,
  onCategoriesChange,
  sortBy,
  onSortChange,
}: WatchlistFiltersProps) {
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenPanel(null);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const allStores = selectedStores.length === STORE_NAMES.length;
  const allCategories = selectedCategories.length === CATEGORIES.length;

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Relevance';

  function togglePanel(key: Exclude<PanelKey, null>) {
    setOpenPanel(prev => (prev === key ? null : key));
  }

  function toggleStore(store: string) {
    onStoresChange(
      selectedStores.includes(store)
        ? selectedStores.filter(s => s !== store)
        : [...selectedStores, store]
    );
  }

  function toggleCategory(category: string) {
    onCategoriesChange(
      selectedCategories.includes(category)
        ? selectedCategories.filter(c => c !== category)
        : [...selectedCategories, category]
    );
  }

  const storeActions = (
    <>
      <button
        type="button"
        onClick={() => onStoresChange(STORE_NAMES)}
        className={cn('filter-panel-action', allStores && 'filter-panel-action-muted')}
      >
        All
      </button>
      <button
        type="button"
        onClick={() => onStoresChange([])}
        className={cn('filter-panel-action', selectedStores.length === 0 && 'filter-panel-action-muted')}
      >
        None
      </button>
    </>
  );

  const categoryActions = (
    <>
      <button
        type="button"
        onClick={() => onCategoriesChange(CATEGORIES)}
        className={cn('filter-panel-action', allCategories && 'filter-panel-action-muted')}
      >
        All
      </button>
      <button
        type="button"
        onClick={() => onCategoriesChange([])}
        className={cn('filter-panel-action', selectedCategories.length === 0 && 'filter-panel-action-muted')}
      >
        None
      </button>
    </>
  );

  return (
    <div ref={barRef} className="filter-nav">
      {openPanel && <div className="filter-panel-backdrop" onClick={() => setOpenPanel(null)} />}
      <div className="filter-nav-inner">
        <div className="filter-bar">
          <div className="filter-group">
            <FilterTrigger
              icon={Store}
              label={allStores ? 'All stores' : `${selectedStores.length} stores`}
              active={!allStores}
              expanded={openPanel === 'stores'}
              onClick={() => togglePanel('stores')}
            />
            {openPanel === 'stores' && (
              <FilterPanel title="Stores" actions={storeActions}>
                {STORES.map(store => {
                  const selected = selectedStores.includes(store.name);
                  return (
                    <FilterOption
                      key={store.name}
                      selected={selected}
                      onClick={() => toggleStore(store.name)}
                      label={store.name}
                    >
                      <img src={store.logo} alt="" className="filter-option-logo" />
                    </FilterOption>
                  );
                })}
              </FilterPanel>
            )}
          </div>

          <div className="filter-group">
            <FilterTrigger
              icon={LayoutGrid}
              label={allCategories ? 'All categories' : `${selectedCategories.length} categories`}
              active={!allCategories}
              expanded={openPanel === 'categories'}
              onClick={() => togglePanel('categories')}
            />
            {openPanel === 'categories' && (
              <FilterPanel title="Category" actions={categoryActions}>
                {CATEGORIES.map(category => {
                  const selected = selectedCategories.includes(category);
                  return (
                    <FilterOption
                      key={category}
                      selected={selected}
                      onClick={() => toggleCategory(category)}
                      label={category}
                    >
                      <span className={cn('filter-cat-dot', `category-${category.toLowerCase().replace(/\s+/g, '-')}`)} />
                    </FilterOption>
                  );
                })}
              </FilterPanel>
            )}
          </div>

          <div className="filter-group">
            <FilterTrigger
              icon={ArrowUpDown}
              label={sortLabel}
              active={sortBy !== 'relevance'}
              expanded={openPanel === 'sort'}
              onClick={() => togglePanel('sort')}
            />
            {openPanel === 'sort' && (
              <FilterPanel title="Sort by" align="right">
                {SORT_OPTIONS.map(opt => (
                  <FilterOption
                    key={opt.value}
                    selected={sortBy === opt.value}
                    onClick={() => onSortChange(opt.value)}
                    label={opt.label}
                  />
                ))}
              </FilterPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
