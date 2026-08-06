import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, LayoutGrid, Store, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { STORES } from '../lib/stores';

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

function categoryDotClass(category: string): string {
  return `category-${category.toLowerCase().replace(/\s+/g, '-')}`;
}

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

  const activeCount =
    (allStores ? 0 : 1) + (allCategories ? 0 : 1) + (sortBy === 'relevance' ? 0 : 1);

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

  function renderStoreOptions() {
    return STORES.map(store => {
      const selected = selectedStores.includes(store.name);
      return (
        <button
          key={store.name}
          type="button"
          role="option"
          aria-selected={selected}
          onClick={() => toggleStore(store.name)}
          className={cn('filter-option', selected && 'filter-option-selected')}
        >
          <span className={cn('filter-check', selected && 'filter-check-selected')}>
            {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </span>
          <img src={store.logo} alt="" className="filter-option-logo" />
          <span className="filter-option-name">{store.name}</span>
        </button>
      );
    });
  }

  function renderCategoryOptions() {
    return CATEGORIES.map(category => {
      const selected = selectedCategories.includes(category);
      return (
        <button
          key={category}
          type="button"
          role="option"
          aria-selected={selected}
          onClick={() => toggleCategory(category)}
          className={cn('filter-option', selected && 'filter-option-selected')}
        >
          <span className={cn('filter-check', selected && 'filter-check-selected')}>
            {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </span>
          <span className={cn('filter-cat-dot', categoryDotClass(category))} />
          <span className="filter-option-name">{category}</span>
        </button>
      );
    });
  }

  function renderSortOptions() {
    return SORT_OPTIONS.map(opt => {
      const selected = sortBy === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          role="option"
          aria-selected={selected}
          onClick={() => onSortChange(opt.value)}
          className={cn('filter-option', selected && 'filter-option-selected')}
        >
          <span className={cn('filter-check', selected && 'filter-check-selected')}>
            {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </span>
          <span className="filter-option-name">{opt.label}</span>
        </button>
      );
    });
  }

  return (
    <div ref={barRef} className="filter-nav">
      <div className="filter-nav-inner">
        <div className="filter-bar">
          <div className="filter-group">
            <button
              type="button"
              onClick={() => togglePanel('stores')}
              aria-haspopup="listbox"
              aria-expanded={openPanel === 'stores'}
              className={cn('filter-trigger', !allStores && 'filter-trigger-active')}
            >
              <Store className="filter-trigger-icon" />
              <span>{allStores ? 'All stores' : `${selectedStores.length} stores`}</span>
              <ChevronDown className="filter-chevron" />
            </button>
            {openPanel === 'stores' && (
              <div className="filter-panel" role="listbox" aria-label="Stores">
                <div className="filter-panel-header">
                  <span className="filter-panel-title">Stores</span>
                  <div className="filter-panel-actions">
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
                  </div>
                </div>
                <div className="filter-panel-list">{renderStoreOptions()}</div>
              </div>
            )}
          </div>

          <div className="filter-group">
            <button
              type="button"
              onClick={() => togglePanel('categories')}
              aria-haspopup="listbox"
              aria-expanded={openPanel === 'categories'}
              className={cn('filter-trigger', !allCategories && 'filter-trigger-active')}
            >
              <LayoutGrid className="filter-trigger-icon" />
              <span>{allCategories ? 'All categories' : `${selectedCategories.length} categories`}</span>
              <ChevronDown className="filter-chevron" />
            </button>
            {openPanel === 'categories' && (
              <div className="filter-panel" role="listbox" aria-label="Category">
                <div className="filter-panel-header">
                  <span className="filter-panel-title">Category</span>
                  <div className="filter-panel-actions">
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
                  </div>
                </div>
                <div className="filter-panel-list">{renderCategoryOptions()}</div>
              </div>
            )}
          </div>

          <div className="filter-group filter-group-sort">
            <button
              type="button"
              onClick={() => togglePanel('sort')}
              aria-haspopup="listbox"
              aria-expanded={openPanel === 'sort'}
              className={cn('filter-trigger', sortBy !== 'relevance' && 'filter-trigger-active')}
            >
              <ArrowUpDown className="filter-trigger-icon" />
              <span>{sortLabel}</span>
              <ChevronDown className="filter-chevron" />
            </button>
            {openPanel === 'sort' && (
              <div className="filter-panel filter-panel-right" role="listbox" aria-label="Sort by">
                <div className="filter-panel-header">
                  <span className="filter-panel-title">Sort by</span>
                </div>
                <div className="filter-panel-list">{renderSortOptions()}</div>
              </div>
            )}
          </div>
        </div>

        <div className="filter-bar-mobile">
          <button
            type="button"
            onClick={() => setOpenPanel(prev => (prev ? null : 'stores'))}
            aria-haspopup="listbox"
            aria-expanded={openPanel !== null}
            className={cn('filter-trigger filter-trigger-mobile', activeCount > 0 && 'filter-trigger-active')}
          >
            <SlidersHorizontal className="filter-trigger-icon" />
            <span>Filters</span>
            {activeCount > 0 && <span className="filter-count-badge">{activeCount}</span>}
            <ChevronDown className="filter-chevron" />
          </button>
          {openPanel && (
            <div className="filter-panel-mobile" role="listbox" aria-label="Filters">
              <div className="filter-section">
                <div className="filter-panel-header">
                  <span className="filter-panel-title">Stores</span>
                  <div className="filter-panel-actions">
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
                  </div>
                </div>
                <div className="filter-panel-list">{renderStoreOptions()}</div>
              </div>
              <div className="filter-section">
                <div className="filter-panel-header">
                  <span className="filter-panel-title">Category</span>
                  <div className="filter-panel-actions">
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
                  </div>
                </div>
                <div className="filter-panel-list">{renderCategoryOptions()}</div>
              </div>
              <div className="filter-section">
                <div className="filter-panel-header">
                  <span className="filter-panel-title">Sort by</span>
                </div>
                <div className="filter-panel-list">{renderSortOptions()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
