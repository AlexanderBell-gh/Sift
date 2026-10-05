import { useState, useRef, useEffect } from 'react';
import { Store, LayoutGrid, ArrowUpDown, Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { STORES } from '../../../lib/stores';
import { CATEGORIES } from '../../../lib/categories';
import FilterTrigger from './filters/FilterTrigger';
import FilterPanel from './filters/FilterPanel';
import FilterOption from './filters/FilterOption';

export type OfferStatus = 'all' | 'offers' | 'plain' | 'expired';

const STATUS_OPTIONS: { value: OfferStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'offers', label: 'On offer' },
  { value: 'plain', label: 'Not on offer' },
  { value: 'expired', label: 'Expired' },
];

const STORE_NAMES = STORES.map(s => s.name);

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
] as const;

interface WatchlistFiltersProps {
  selectedStores: string[];
  onStoresChange: (stores: string[]) => void;
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  status: OfferStatus;
  onStatusChange: (status: OfferStatus) => void;
  statusCounts: Record<OfferStatus, number>;
}

type PanelKey = 'stores' | 'categories' | 'sort' | null;

export default function WatchlistFilters({
  selectedStores,
  onStoresChange,
  selectedCategories,
  onCategoriesChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
  status,
  onStatusChange,
  statusCounts,
}: WatchlistFiltersProps) {
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);
  const [isClosing, setIsClosing] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  function closePanel() {
    if (openPanel === null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpenPanel(null);
      return;
    }
    setIsClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setOpenPanel(null);
      setIsClosing(false);
    }, 200);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        closePanel();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  });

  useEffect(() => {
    if (!openPanel) return;
    const mq = window.matchMedia('(max-width: 640px)');
    function apply() {
      document.body.style.overflow = mq.matches ? 'hidden' : '';
    }
    apply();
    mq.addEventListener('change', apply);
    return () => {
      document.body.style.overflow = '';
      mq.removeEventListener('change', apply);
    };
  }, [openPanel]);

  // Mobile only: hide filter bar on scroll down, reveal on scroll up.
  // Class-driven (no re-renders); forced visible while a panel is open.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const bar = barRef.current;
    let lastY = window.scrollY;
    let ticking = false;
    function update() {
      ticking = false;
      if (!bar || !mq.matches) {
        bar?.classList.remove('is-hidden');
        return;
      }
      if (openPanel !== null) {
        bar.classList.remove('is-hidden');
        lastY = window.scrollY;
        return;
      }
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (y <= 120 || dy < -4) {
        bar.classList.remove('is-hidden');
      } else if (dy > 4) {
        bar.classList.add('is-hidden');
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    function onMqChange() {
      lastY = window.scrollY;
      update();
    }
    lastY = window.scrollY;
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onMqChange);
    return () => {
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onMqChange);
      bar?.classList.remove('is-hidden');
    };
  }, [openPanel]);

  const allStores = selectedStores.length === STORE_NAMES.length;
  const allCategories = selectedCategories.length === CATEGORIES.length;

  const sortLabel = status !== 'all'
    ? STATUS_OPTIONS.find(o => o.value === status)?.label ?? 'All'
    : SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Relevance';
  const sortActive = sortBy !== 'relevance' || status !== 'all';

  function togglePanel(key: Exclude<PanelKey, null>) {
    if (openPanel === key) {
      closePanel();
      return;
    }
    window.clearTimeout(closeTimer.current);
    setIsClosing(false);
    setOpenPanel(key);
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
        onClick={() => onCategoriesChange([...CATEGORIES])}
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
      {openPanel && <div className={cn('filter-panel-backdrop', isClosing && 'is-closing')} onClick={closePanel} />}
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
              <FilterPanel title="Stores" actions={storeActions} closing={isClosing}>
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
              <FilterPanel title="Category" actions={categoryActions} closing={isClosing}>
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
              active={sortActive}
              expanded={openPanel === 'sort'}
              onClick={() => togglePanel('sort')}
            />
            {openPanel === 'sort' && (
              <FilterPanel title="Sort & status" align="right" closing={isClosing}>
                <span className="filter-panel-title">Sort</span>
                {SORT_OPTIONS.map(opt => (
                  <FilterOption
                    key={opt.value}
                    selected={sortBy === opt.value}
                    onClick={() => onSortChange(opt.value)}
                    label={opt.label}
                  />
                ))}
                <span className="filter-panel-title">Status</span>
                {STATUS_OPTIONS.map(opt => (
                  <FilterOption
                    key={opt.value}
                    selected={status === opt.value}
                    onClick={() => onStatusChange(opt.value)}
                    label={`${opt.label} (${statusCounts[opt.value]})`}
                  />
                ))}
              </FilterPanel>
            )}
          </div>

          <div className="watchlist-search" role="search">
            <Search className="watchlist-search-icon" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && searchQuery) {
                  onSearchChange('');
                }
              }}
              placeholder="Search products…"
              aria-label="Search watchlist"
              className="watchlist-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="watchlist-search-clear"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
