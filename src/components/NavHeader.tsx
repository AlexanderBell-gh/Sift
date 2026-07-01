import { useNavigate } from 'react-router-dom';
import { BookmarkCheck, LogOut, ArrowLeft, Sun, Moon, Shield } from 'lucide-react';
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
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <AlertBell />
          {token && user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              title="Admin"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
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
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline">{user?.username}</span>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
