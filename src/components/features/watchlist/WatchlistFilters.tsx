import { useState, useRef, useEffect } from 'react';
import { Store, LayoutGrid, ArrowUpDown, Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { STORES } from '../../../lib/stores';
import { CATEGORIES } from '../../../lib/categories';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useBodyLock } from '../../../hooks/useBodyLock';
import { MOBILE_QUERY } from '../../../hooks/useIsMobile';
import FilterTrigger from './filters/FilterTrigger';
import FilterPanel from './filters/FilterPanel';
import FilterOption from './filters/FilterOption';

export type OfferStatus = 'all' | 'offers' | 'plain' | 'expired';

const STATUS_OPTIONS: { value: OfferStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'offers', label: 'Offers' },
  { value: 'plain', label: 'Regular Price' },
  { value: 'expired', label: 'Expired' },
];

const STORE_NAMES = STORES.map(s => s.name);

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
] as const;

// Mobile filter dock geometry. NAV_H must match .nav height (72px);
// HIDE_TOP slides the 52px bar fully out of view; REVEAL_Y keeps it
// docked under the static header near page top; DY dead-zones jitter.
// HIDE_Y adds hysteresis past REVEAL_Y so the bar never toggles at the
// threshold. GAP_PX must match the CSS content-gap delta (76px visible
// vs 24px hidden padding on .watchlist-content).
const NAV_H = 72;
const HIDE_TOP = '-60px';
const REVEAL_Y = 120;
const SCROLL_DY = 4;
const HIDE_Y = REVEAL_Y + 48;
const GAP_PX = 52;
const HIDE_ROOM = 24;
const SUPPRESS_MS = 250;

// Dock offset tracking the static header bottom: at scroll y the header
// occupies [-y, NAV_H - y], so the bar hugs it with no gap until it
// scrolls fully off (y >= NAV_H), then sticks at viewport top.
function dockTop(y: number): string {
  return `${Math.max(0, NAV_H - y)}px`;
}

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
  const isMobile = useIsMobile();
  // Counter-based: survives the account sheet opening on top.
  useBodyLock(openPanel !== null && isMobile);

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

  // Mobile only: header is static, so the fixed bar tracks the header
  // bottom (72 - y) near page top and sticks to viewport top (0) once the
  // header scrolls off. Hidden on scroll down via top offset (never transform,
  // which would re-anchor the fixed sheets inside the bar). Class-driven
  // (no re-renders); forced visible while a panel is open; only the
  // hidden toggle animates, sync writes snap via .no-anim.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const bar = barRef.current;
    let lastY = window.scrollY;
    let ticking = false;
    let suppressUntil = 0;
    function place(y: number, hidden: boolean) {
      if (!bar) return;
      if (!mq.matches) {
        bar.classList.remove('is-hidden');
        bar.style.top = '';
        return;
      }
      if (hidden) {
        bar.classList.add('is-hidden');
        bar.style.top = HIDE_TOP;
        return;
      }
      bar.classList.remove('is-hidden');
      bar.style.top = dockTop(y);
    }
    // Sync write without animation: only scroll-driven hidden toggles
    // animate (via the CSS transition). Every other write (mount, panel
    // open/close, breakpoint flip) snaps, so the bar never visibly
    // slides 0 -> 72 -> 0 on panel close or trails on re-sync.
    function sync(y: number, hidden: boolean) {
      if (!bar) return;
      bar.classList.add('no-anim');
      place(y, hidden);
      void bar.offsetHeight;
      bar.classList.remove('no-anim');
    }
    // Hiding collapses the content gap by GAP_PX, shrinking the page.
    // Only hide when room remains past the current position after the
    // collapse; short lists keep the bar docked instead of bouncing.
    function canHide(y: number): boolean {
      return document.documentElement.scrollHeight - window.innerHeight - GAP_PX - y > HIDE_ROOM;
    }
    function update() {
      ticking = false;
      if (!bar || !mq.matches) {
        bar?.classList.remove('is-hidden');
        if (bar) bar.style.top = '';
        return;
      }
      if (openPanel !== null) {
        // Panel open: force visible, snapped (no slide while the sheet
        // above opens). Scroll is locked, so y is frozen here.
        sync(window.scrollY, false);
        lastY = window.scrollY;
        return;
      }
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      // Settle window for the content-gap transition: the collapse pulls
      // scrollY up and that echo must not re-show the bar.
      if (performance.now() < suppressUntil) return;
      if (y <= REVEAL_Y || dy < -SCROLL_DY) {
        place(y, false);
      } else if (dy > SCROLL_DY && y > HIDE_Y && canHide(y)) {
        suppressUntil = performance.now() + SUPPRESS_MS;
        place(y, true);
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    function onMqChange() {
      lastY = window.scrollY;
      if (!bar) return;
      if (!mq.matches) {
        bar.style.top = '';
        bar.classList.remove('is-hidden');
        return;
      }
      sync(window.scrollY, false);
    }
    lastY = window.scrollY;
    // Initial position snaps: no entrance slide on page load.
    if (bar && mq.matches) sync(window.scrollY, false);
    else update();
    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onMqChange);
    return () => {
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onMqChange);
      // No top/class reset here: the re-run update()/sync() owns state.
      // Resetting to the CSS default flashed the bar 0 -> 72 -> 0 with
      // transition on every panel open/close.
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
