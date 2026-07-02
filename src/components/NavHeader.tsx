import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkCheck, LogOut, ArrowLeft, Sun, Moon, Shield, Settings, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import AlertBell from './AlertBell';

interface NavHeaderProps {
  title?: string;
  showBack?: boolean;
}

export default function NavHeader({ title = 'Sift', showBack = false }: NavHeaderProps) {
  const { token, user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="border-b border-zinc-200/50 dark:border-white/10 bg-white/70 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="text-xl font-bold gradient-text">{title}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <AlertBell />
          {token && (
            <button
              onClick={() => navigate('/watchlist')}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Watchlist</span>
            </button>
          )}
          {token ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{user?.username}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-lg py-1 animate-fade-in">
                  <button
                    onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => { toggle(); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => { navigate('/admin'); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </button>
                  )}
                  <div className="border-t border-zinc-200 dark:border-white/10 my-1" />
                  <button
                    onClick={() => { logout(); navigate('/'); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="px-3 py-1.5 rounded-lg text-sm bg-accent text-black font-medium hover:bg-accent-light transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
