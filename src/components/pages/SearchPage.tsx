import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { searchAutocomplete, getAllWatchlistNames, type AutocompleteProduct } from '../../lib/api';
import { getHistory, addSearch, clearHistory } from '../../lib/searchHistory';

import NavHeader from '../layout/NavHeader';
import { StoreSelect, MAX_STORES } from '../ui/StoreSelect';
import { OffersSection } from '../features/search/OffersSection';
import { PopularSection } from '../features/search/PopularSection';
import { STORES } from '../../lib/stores';
import { useAuth } from '../../contexts/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useBodyLock } from '../../hooks/useBodyLock';

export default function SearchPage() {
  const { token, user } = useAuth();
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);

  const [history, setHistory] = useState<string[]>(() => getHistory());

  const [autocompleteProducts, setAutocompleteProducts] = useState<AutocompleteProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNoMatches, setShowNoMatches] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Counter-based: survives the store picker sheet opening on top.
  useBodyLock(sheetOpen && isMobile);

  const [watchlistNames, setWatchlistNames] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getAllWatchlistNames(token)
      .then(names => { if (!cancelled) setWatchlistNames(names); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const [selectedStores, setSelectedStores] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sift-selected-stores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        const valid = parsed.filter((id) => STORES.some((s) => s.id === id));
        if (valid.length > 0 && valid.length <= MAX_STORES) {
          return new Set(valid);
        }
      } catch {
        // fall through to empty default
      }
    }
    return new Set<string>();
  });

  useEffect(() => {
    localStorage.setItem('sift-selected-stores', JSON.stringify([...selectedStores]));
  }, [selectedStores]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const suggestionsOpen = showSuggestions && query.length >= 2 && autocompleteProducts.length > 0;
  const historyOpen = showHistory && history.length > 0;
  const dropdownOpen = suggestionsOpen ? 'suggestions' : historyOpen ? 'history' : null;

  const closeDropdowns = useCallback(() => {
    setShowSuggestions(false);
    setShowHistory(false);
    setShowNoMatches(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (query.length < 2) return;

    const active = document.activeElement;
    if (active !== inputRef.current && active !== sheetInputRef.current) {
      return;
    }

    setShowHistory(false);
    setActiveIndex(-1);

    const timeoutId = setTimeout(() => {
      const results = searchAutocomplete(query, watchlistNames);
      setAutocompleteProducts(results);
      setShowSuggestions(results.length > 0);
      setShowNoMatches(results.length === 0);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query, watchlistNames]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Sheet manages its own dismissal via backdrop/close/Escape.
      if (sheetOpen) return;
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        closeDropdowns();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdowns, sheetOpen]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document.getElementById(`search-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleSearch = useCallback((searchQuery?: string) => {
    const q = (searchQuery ?? queryRef.current).trim();
    if (!q) return;

    closeDropdowns();
    setHistory(addSearch(q));

    const storesToSearch = STORES.filter((s) => selectedStores.has(s.id));
    storesToSearch.forEach((store) => {
      window.open(store.searchUrl(q), '_blank', 'noopener,noreferrer');
    });
  }, [selectedStores, closeDropdowns]);

  function selectSuggestion(suggestion: string) {
    setQuery(suggestion);
    closeDropdowns();
    handleSearch(suggestion);
  }

  function selectHistory(item: string) {
    setQuery(item);
    closeDropdowns();
    handleSearch(item);
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
    closeDropdowns();
  }

  // Mobile slide-up sheet: same query/suggestion/history state, new host.
  // Close animates out (backdrop fade + panel slide-down, like the other
  // sheets) before unmount; instant under reduced-motion.
  const [isClosing, setIsClosing] = useState(false);
  const sheetCloseTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(sheetCloseTimer.current), []);

  function openSheet() {
    window.clearTimeout(sheetCloseTimer.current);
    setIsClosing(false);
    setSheetOpen(true);
  }

  function closeSheet() {
    if (!sheetOpen || isClosing) return;
    sheetInputRef.current?.blur();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSheetOpen(false);
      closeDropdowns();
      return;
    }
    setIsClosing(true);
    sheetCloseTimer.current = window.setTimeout(() => {
      setSheetOpen(false);
      setIsClosing(false);
      closeDropdowns();
    }, 200);
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const t = window.setTimeout(() => sheetInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [sheetOpen]);

  function handleSheetSearch() {
    handleSearch();
    closeSheet();
  }

  function selectSheetSuggestion(suggestion: string) {
    selectSuggestion(suggestion);
    closeSheet();
  }

  function selectSheetHistory(item: string) {
    selectHistory(item);
    closeSheet();
  }

  function moveActive(dir: 1 | -1) {
    const list = suggestionsOpen ? autocompleteProducts : historyOpen ? history : null;
    if (!list) return;
    const max = list.length - 1;
    setActiveIndex((prev) => {
      if (prev === -1) return dir === 1 ? 0 : max;
      return Math.min(max, Math.max(0, prev + dir));
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      closeDropdowns();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActive(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActive(-1);
      return;
    }
    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      if (suggestionsOpen) {
        const product = autocompleteProducts[activeIndex];
        if (product) selectSuggestion(product.name);
      } else if (historyOpen) {
        const entry = history[activeIndex];
        if (entry !== undefined) selectHistory(entry);
      }
    }
  }

  const [daypart] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  });
  const firstName = !user?.isTrial ? user?.username?.split(' ')[0] : undefined;

  function showRelevantDropdown() {
    if (query.length < 2 && history.length > 0) {
      setShowHistory(true);
      setShowSuggestions(false);
      setShowNoMatches(false);
      setActiveIndex(-1);
    } else if (query.length >= 2 && autocompleteProducts.length > 0) {
      setShowSuggestions(true);
      setShowHistory(false);
      setActiveIndex(-1);
    } else if (query.length >= 2 && showNoMatches) {
      setShowNoMatches(true);
    }
  }

  function handleSheetKeyDown(e: React.KeyboardEvent) {
    handleKeyDown(e);
    if (e.key === 'Escape') {
      closeSheet();
    }
  }

  const sheetDropdownOpen = sheetOpen ? dropdownOpen : null;
  const storeHint = selectedStores.size === 0
    ? 'Select at least one store to search'
    : `Searching ${selectedStores.size} store${selectedStores.size === 1 ? '' : 's'}`;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavHeader />

      <section className="hero">
        <div className="container">
          <h1>Good {daypart}{firstName ? <>, <span className="text-gradient">{firstName}</span></> : ''}</h1>
          <p>Pick up to 3 stores, search, and pin what you buy.</p>

          <div className="store-chips-wrapper">
            <StoreSelect
              selected={selectedStores}
              onChange={setSelectedStores}
            />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="search-container"
            ref={suggestionsRef}
            role="search"
            aria-label="Search for products"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowNoMatches(false);
                setActiveIndex(-1);
              }}
              onFocus={() => {
                // Mobile opens the slide-up sheet; inline dropdown stays desktop-only.
                // The mobile input is readOnly (no keyboard flash): it only triggers the sheet.
                if (isMobile) {
                  openSheet();
                  return;
                }
                showRelevantDropdown();
              }}
              onClick={() => {
                if (isMobile) openSheet();
              }}
              readOnly={isMobile}
              onKeyDown={handleKeyDown}
              placeholder="Search for butter, oat milk, avocados…"
              className="search-input"
              role="combobox"
              aria-expanded={dropdownOpen !== null}
              aria-controls={dropdownOpen === 'suggestions' ? 'search-suggestions' : dropdownOpen === 'history' ? 'search-history' : undefined}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
            />

            <button
              type="submit"
              disabled={!query.trim() || selectedStores.size === 0}
              className="search-button"
              title={selectedStores.size === 0 ? 'Select at least one store to search' : undefined}
            >
              Search
            </button>

            {suggestionsOpen && !sheetOpen && (
              <div
                id="search-suggestions"
                className="suggestions-dropdown"
                role="listbox"
                aria-label="Search suggestions"
              >
                {autocompleteProducts.map((product, i) => (
                  <button
                    key={product.name}
                    id={`search-option-${i}`}
                    type="button"
                    onClick={() => selectSuggestion(product.name)}
                    className={`suggestion-item${i === activeIndex ? ' selected' : ''}`}
                    role="option"
                    aria-selected={i === activeIndex}
                  >
                    <Search className="icon-sm opacity-50" />
                    <span className="text-sm">{product.name}</span>
                  </button>
                ))}
              </div>
            )}

            {showNoMatches && query.length >= 2 && !suggestionsOpen && !sheetOpen && (
              <div className="suggestions-dropdown" role="status">
                <div className="suggestions-empty">
                  No matching products — press Enter to search anyway.
                </div>
              </div>
            )}

            {historyOpen && !sheetOpen && (
              <div
                id="search-history"
                className="suggestions-dropdown"
                role="listbox"
                aria-label="Recent searches"
              >
                <div className="suggestions-header">
                  <span>Recent searches</span>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="suggestions-clear"
                    aria-label="Clear recent searches"
                  >
                    Clear
                  </button>
                </div>
                {history.map((item, i) => (
                  <button
                    key={item}
                    id={`search-option-${i}`}
                    type="button"
                    onClick={() => selectHistory(item)}
                    className={`suggestion-item${i === activeIndex ? ' selected' : ''}`}
                    role="option"
                    aria-label={item}
                    aria-selected={i === activeIndex}
                  >
                    <Search className="icon-sm opacity-50" />
                    {item}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </section>

      {isMobile && sheetOpen && createPortal(
        <>
          <div className={`search-sheet-backdrop${isClosing ? ' is-closing' : ''}`} onClick={closeSheet} />
          <div className={`search-sheet-panel${isClosing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label="Search">
            <div className="search-sheet-header">
              <span className="search-sheet-title">Search</span>
              <button
                type="button"
                onClick={closeSheet}
                className="search-sheet-close"
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>
            <StoreSelect
              selected={selectedStores}
              onChange={setSelectedStores}
            />
            <form
              onSubmit={(e) => { e.preventDefault(); handleSheetSearch(); }}
              role="search"
              aria-label="Search for products"
            >
              <div className="search-sheet-field">
                <div className="search-sheet-field-row">
                  <Search className="icon-sm opacity-50" aria-hidden="true" />
                  <input
                    ref={sheetInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setShowNoMatches(false);
                      setActiveIndex(-1);
                    }}
                    onFocus={showRelevantDropdown}
                    onKeyDown={handleSheetKeyDown}
                    placeholder={selectedStores.size === 0 ? storeHint : 'Search for butter, oat milk, avocados…'}
                    className="search-sheet-input"
                    role="combobox"
                    aria-expanded={sheetDropdownOpen !== null}
                    aria-controls={sheetDropdownOpen === 'suggestions' ? 'search-sheet-suggestions' : sheetDropdownOpen === 'history' ? 'search-sheet-history' : undefined}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!query.trim() || selectedStores.size === 0}
                  className="search-sheet-submit"
                  title={selectedStores.size === 0 ? 'Select at least one store to search' : undefined}
                >
                  Search
                </button>
              </div>
            </form>
            {suggestionsOpen && (
              <div
                id="search-sheet-suggestions"
                className="search-sheet-list"
                role="listbox"
                aria-label="Search suggestions"
              >
                {autocompleteProducts.map((product, i) => (
                  <button
                    key={product.name}
                    id={`search-option-${i}`}
                    type="button"
                    onClick={() => selectSheetSuggestion(product.name)}
                    className={`suggestion-item${i === activeIndex ? ' selected' : ''}`}
                    role="option"
                    aria-selected={i === activeIndex}
                  >
                    <Search className="icon-sm opacity-50" />
                    <span className="text-sm">{product.name}</span>
                  </button>
                ))}
              </div>
            )}
            {showNoMatches && query.length >= 2 && !suggestionsOpen && (
              <div className="search-sheet-list" role="status">
                <div className="suggestions-empty">
                  No matching products — press Enter to search anyway.
                </div>
              </div>
            )}
            {historyOpen && (
              <div
                id="search-sheet-history"
                className="search-sheet-list"
                role="listbox"
                aria-label="Recent searches"
              >
                <div className="suggestions-header">
                  <span>Recent searches</span>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="suggestions-clear"
                    aria-label="Clear recent searches"
                  >
                    Clear
                  </button>
                </div>
                {history.map((item, i) => (
                  <button
                    key={item}
                    id={`search-option-${i}`}
                    type="button"
                    onClick={() => selectSheetHistory(item)}
                    className={`suggestion-item${i === activeIndex ? ' selected' : ''}`}
                    role="option"
                    aria-label={item}
                    aria-selected={i === activeIndex}
                  >
                    <Search className="icon-sm opacity-50" />
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>,
        document.body
      )}

      <OffersSection />
      <PopularSection />
    </div>
  );
}
