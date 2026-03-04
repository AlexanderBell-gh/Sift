import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Plus, FolderPlus, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import type { UserRole } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddProduct: () => void;
  onAddCategory: () => void;
  user?: { id: string; email: string; username: string; role: UserRole; isTrial?: boolean; trialExpiresAt?: number | null } | null;
  onSignOut?: () => void;
}

export function Header({ searchQuery, onSearchChange, onAddProduct, onAddCategory, user, onSignOut }: HeaderProps) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('pricetrackr_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('pricetrackr_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setIsMenuOpen(false);
    onSignOut?.();
  };

  const handleSettings = () => {
    setIsMenuOpen(false);
    navigate('/app/settings');
  };

  return (
    <header className="bg-white dark:bg-zinc-900 shadow-sm sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="/light_mode_logo.png"
              alt="PriceTrackr"
              className="h-12 rounded-lg object-contain dark:hidden"
            />
            <img
              src="/dark_mode_logo.png"
              alt="PriceTrackr"
              className="h-12 rounded-lg object-contain hidden dark:block"
            />
          </div>
 
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>
 
            <Button onClick={onAddProduct} className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Product</span>
            </Button>

            <Button onClick={onAddCategory} variant="secondary" className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Category</span>
            </Button>

            {user && (
              <div className="relative ml-2" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user.username}</span>
                    {user.isTrial && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                        Trial
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                    <button
                      onClick={handleSettings}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => setIsDark(!isDark)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
