import { useState, useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { getSearchSuggestions, searchAutocomplete, type AutocompleteProduct } from '../lib/api';
import { getHistory, addSearch, clearHistory } from '../lib/searchHistory';
import NavHeader from './NavHeader';
import { StoreSelect } from './ui/StoreSelect';
import { StoreOffers } from './StoreOffers';
import { STORES } from '../lib/stores';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);

  const [history, setHistory] = useState<string[]>(() => getHistory());

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [autocompleteProducts, setAutocompleteProducts] = useState<AutocompleteProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setSuggestions([]);
      setAutocompleteProducts([]);
      setShowSuggestions(false);
      return;
    }

    const input = inputRef.current;
    if (!input || document.activeElement !== input) {
      return;
    }

    setShowHistory(false);

    const timeoutId = setTimeout(async () => {
      try {
        const [suggestionsData, autocompleteData] = await Promise.all([
          getSearchSuggestions(query),
          searchAutocomplete(query),
        ]);
        setSuggestions(suggestionsData);
        setAutocompleteProducts(autocompleteData);
        setShowSuggestions(suggestionsData.length > 0 || autocompleteData.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Autocomplete failed', err);
        setSuggestions([]);
        setAutocompleteProducts([]);
        setShowSuggestions(false);
      }
    }, 300);

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
    setSelectedIndex(-1);
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
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowHistory(false);
      setSelectedIndex(-1);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavHeader />

      <>
          <section className="hero">
            <div className="container">
              <h1>Explore Thousands of Offers <br /><span className="text-gradient">In One Place</span><br /></h1>
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
                      } else if (suggestions.length > 0) {
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

                  {showSuggestions && (suggestions.length > 0 || autocompleteProducts.length > 0) && (
                    <div
                      className="suggestions-dropdown"
                      role="listbox"
                      aria-label="Search suggestions"
                      aria-expanded={showSuggestions}
                    >
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => selectSuggestion(suggestion)}
                          className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                          role="option"
                          aria-selected={index === selectedIndex}
                          aria-label={suggestion}
                        >
                          <Search className="w-4 h-4 opacity-50" />
                          {suggestion}
                        </button>
                      ))}

                      {autocompleteProducts.length > 0 && (
                        <>
                          <div className="suggestions-header">
                            <span>Products</span>
                          </div>
                          {autocompleteProducts.map((product) => (
                            <button
                              key={product.name}
                              type="button"
                              onClick={() => selectSuggestion(product.name)}
                              className="suggestion-item"
                              role="option"
                            >
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-8 h-8 rounded object-contain"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-[var(--border)]" />
                              )}
                              <div className="flex flex-col items-start">
                                <span className="text-sm">{product.name}</span>
                                {product.brand && (
                                  <span className="text-xs text-[var(--muted)]">{product.brand}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </>
                      )}
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
                          aria-selected={selectedIndex === history.indexOf(item)}
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
