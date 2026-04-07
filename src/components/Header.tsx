import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Plus, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import type { UserRole } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddProduct: () => void;
  user?: { id: string; email: string; username: string; role: UserRole; isTrial?: boolean; trialExpiresAt?: number | null } | null;
  onSignOut?: () => void;
}

export function Header({ searchQuery, onSearchChange, onAddProduct, user, onSignOut }: HeaderProps) {
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
    <header className="glass border-b border-zinc-200/50 dark:border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img
              src="/light_mode_logo.png"
              alt="PriceTrackr"
              className="h-13 w-auto object-contain dark:hidden"
            />
            <img
              src="/dark_mode_logo.png"
              alt="PriceTrackr"
              className="h-13 w-auto object-contain hidden dark:block"
            />
          </div>
 
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-56 pl-9 pr-4 py-1.5 rounded-lg bg-transparent border border-zinc-200/80 dark:border-white/10 text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-400/60 transition-all"
              />
            </div>
 
            <Button onClick={onAddProduct} className="flex items-center gap-1.5 h-9 px-3 text-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Product</span>
            </Button>

            {user && (
              <div className="relative ml-1" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline font-medium">{user.username}</span>
                    {user.isTrial && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                        Trial
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-[0_16px_32px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.4)] border border-zinc-200/80 dark:border-white/10 py-1.5 z-50 animate-slide-up">
                    <button
                      onClick={handleSettings}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </button>
                    <button
                      onClick={() => setIsDark(!isDark)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors"
                    >
                      {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <hr className="my-1.5 border-zinc-200/80 dark:border-white/10" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
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
