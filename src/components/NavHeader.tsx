import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Sun, Moon, Shield, Settings } from 'lucide-react';
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
    <nav className="h-[72px] flex items-center justify-between bg-white/90 dark:bg-[#0D1117]/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 flex w-full justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <a href="/" className="flex items-center gap-3 no-underline">
            <div className="relative w-8 h-8 grid place-items-center">
              <div className="absolute w-5 h-7 bg-accent rounded-sm -rotate-[10deg]" />
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full z-10" />
              <div className="absolute w-7 h-0.5 bg-white top-1/2 left-0.5 shadow-[0_0_4px_rgba(255,255,255,0.8)] z-20 animate-[scan_2s_ease-in-out_infinite]" />
            </div>
            <span className="font-sans font-extrabold text-[26px] tracking-tight text-zinc-900 dark:text-zinc-50">{title}</span>
          </a>
        </div>

        {/* Nav Links + User */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-accent transition-colors"
            >
              Search
            </button>
            {token && (
              <button
                onClick={() => navigate('/watchlist')}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-accent transition-colors"
              >
                Watchlist
              </button>
            )}
          </div>

          <AlertBell />

          {token ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-accent transition-colors"
              >
                <div className="w-7 h-7 bg-accent text-white rounded-full grid place-items-center text-xs font-semibold">
                  {user?.username?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hidden sm:inline">
                  {user?.username}
                </span>
                <svg className={`w-2.5 h-2.5 text-zinc-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 7L0 2h10z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] py-2 animate-[slideDown_0.2s_ease-out] z-[101]">
                  <button
                    onClick={() => { navigate('/admin'); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-lg mx-1"
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </button>
                  <button
                    onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-lg mx-1"
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => { toggle(); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-lg mx-1"
                    style={{ width: 'calc(100% - 8px)' }}
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 my-1 mx-2" />
                  <button
                    onClick={() => { logout(); navigate('/'); setMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors rounded-lg mx-1"
                    style={{ width: 'calc(100% - 8px)' }}
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
              className="px-4 py-2 rounded-full text-sm font-semibold bg-accent text-white hover:bg-accent-light transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 30%; }
          50% { top: 70%; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </nav>
  );
}
