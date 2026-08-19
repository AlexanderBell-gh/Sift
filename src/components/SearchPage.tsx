import { useState, useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { searchAutocomplete, getAllWatchlistNames, type AutocompleteProduct } from '../lib/api';
import { getHistory, addSearch, clearHistory } from '../lib/searchHistory';

import NavHeader from './NavHeader';
import { StoreSelect } from './ui/StoreSelect';
import { DealSection } from './DealSection';
import { STORES } from '../lib/stores';

export default function SearchPage() {
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

  const [watchlistNames, setWatchlistNames] = useState<string[]>([]);

  useEffect(() => {
    getAllWatchlistNames().then(setWatchlistNames).catch(() => {});
  }, []);

  const [selectedStores, setSelectedStores] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sift-selected-stores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        return new Set(parsed);
      } catch {
        return new Set(STORES.map((s) => s.id));
      }
    }
    return new Set(STORES.map((s) => s.id));
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

    const input = inputRef.current;
    if (!input || document.activeElement !== input) {
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
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        closeDropdowns();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeDropdowns]);

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
      window.open(store.searchUrl(q), '_blank');
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
        selectSuggestion(autocompleteProducts[activeIndex].name);
      } else if (historyOpen) {
        selectHistory(history[activeIndex]);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavHeader />

      <section className="hero">
        <div className="container">
          <h1>
            Find and Track Offers
            <span className="text-gradient block">In One Place</span>
          </h1>
          <p>Find the best grocery offers across 11 UK supermarkets</p>

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
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search for butter, oat milk, avocados..."
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

            {suggestionsOpen && (
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
                    <Search className="w-4 h-4 opacity-50" />
                    <span className="text-sm">{product.name}</span>
                  </button>
                ))}
              </div>
            )}

            {showNoMatches && query.length >= 2 && !suggestionsOpen && (
              <div className="suggestions-dropdown" role="status">
                <div className="suggestions-empty">
                  No matching products — press Enter to search anyway
                </div>
              </div>
            )}

            {historyOpen && (
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
                    <Search className="w-4 h-4 opacity-50" />
                    {item}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </section>

      <DealSection />
    </div>
  );
}
