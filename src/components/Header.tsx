import { useState, useEffect } from 'react';
import { Search, Sun, Moon, Plus } from 'lucide-react';
import { Button } from './ui/Button';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddProduct: () => void;
}

export function Header({ searchQuery, onSearchChange, onAddProduct }: HeaderProps) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('pricetrackr_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('pricetrackr_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="PriceTrackr"
              className="w-12 h-12 rounded-xl object-contain bg-white"
            />
            <h1 className="text-2xl font-bold tracking-tight">PriceTrackr</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

            <Button onClick={onAddProduct} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Product</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
