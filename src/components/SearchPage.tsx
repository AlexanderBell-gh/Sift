import { useState, useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { searchAutocomplete, getAllWatchlistNames, type AutocompleteProduct } from '../lib/api';
import { getHistory, addSearch, clearHistory } from '../lib/searchHistory';

import NavHeader from './NavHeader';
import { StoreSelect } from './ui/StoreSelect';
import { StoreOffers } from './StoreOffers';
import { STORES } from '../lib/stores';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);

  const [history, setHistory] = useState<string[]>(() => getHistory());

  const [autocompleteProducts, setAutocompleteProducts] = useState<AutocompleteProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  useEffect(() => {
    if (query.length < 2) {
      setAutocompleteProducts([]);
      setShowSuggestions(false);
      return;
    }

    const input = inputRef.current;
    if (!input || document.activeElement !== input) {
      return;
    }

    setShowHistory(false);

    const timeoutId = setTimeout(() => {
      const results = searchAutocomplete(query, watchlistNames);
      setAutocompleteProducts(results);
      setShowSuggestions(results.length > 0);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((searchQuery?: string) => {
    const q = (searchQuery ?? queryRef.current).trim();
    if (!q) return;

    setShowSuggestions(false);
    setShowHistory(false);
    setHistory(addSearch(q));

    const storesToSearch = STORES.filter((s) => selectedStores.has(s.id));
    storesToSearch.forEach((store) => {
      window.open(store.searchUrl(q), '_blank');
    });
  }, [selectedStores]);

  function selectSuggestion(suggestion: string) {
    setQuery(suggestion);
    setShowSuggestions(false);
    setShowHistory(false);
    handleSearch(suggestion);
  }

  function selectHistory(item: string) {
    setQuery(item);
    setShowHistory(false);
    handleSearch(item);
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
    setShowHistory(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowHistory(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavHeader />

      <>
          <section className="hero">
            <div className="container">
              <h1>Explore and Track Offers <br /><span className="text-gradient">In One Place</span><br /></h1>
              <p>Find the best grocery offers across 11 UK supermarkets.<br /> Search up to 3 stores simultaneously</p>

              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="search-container" ref={suggestionsRef} role="search" aria-label="Search for products">
                  <StoreSelect
                    selected={selectedStores}
                    onChange={setSelectedStores}
                  />

                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                      if (query.length < 2 && history.length > 0) {
                        setShowHistory(true);
                        setShowSuggestions(false);
                      } else if (autocompleteProducts.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for butter, oat milk, avocados..."
                    className="search-input"
                  />

                  <button
                    type="submit"
                    disabled={!query.trim()}
                    className="search-button"
                  >
                    Search
                  </button>

                  {showSuggestions && autocompleteProducts.length > 0 && (
                    <div
                      className="suggestions-dropdown"
                      role="listbox"
                      aria-label="Search suggestions"
                      aria-expanded={showSuggestions}
                    >
                      {autocompleteProducts.map((product) => (
                        <button
                          key={product.name}
                          type="button"
                          onClick={() => selectSuggestion(product.name)}
                          className="suggestion-item"
                          role="option"
                        >
                          <Search className="w-4 h-4 opacity-50" />
                          <span className="text-sm">{product.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {showHistory && history.length > 0 && (
                    <div
                      className="suggestions-dropdown"
                      role="listbox"
                      aria-label="Recent searches"
                      aria-expanded={showHistory}
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
                      {history.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => selectHistory(item)}
                          className="suggestion-item"
                          role="option"
                          aria-label={item}
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

          <StoreOffers />
        </>
    </div>
  );
}
