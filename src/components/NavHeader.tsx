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
    <nav className="nav">
      <div className="container" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <a href="/" className="logo">
            <div className="logo-mark">
              <div className="logo-tag"></div>
              <div className="logo-scan-line"></div>
            </div>
            <div className="logo-text">{title}</div>
          </a>
        </div>

        {/* Nav Links + User */}
        <div className="nav-links">
          <div className="hidden sm:flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="nav-link"
            >
              Search
            </button>
            {token && (
              <button
                onClick={() => navigate('/watchlist')}
                className="nav-link"
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
                className="user-menu-wrapper"
              >
                <div className="user-avatar">
                  {user?.username?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <span className="user-name hidden sm:inline">
                  {user?.username}
                </span>
                <svg className={`dropdown-arrow transition-transform ${menuOpen ? 'rotate-180' : ''}`} viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 7L0 2h10z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="dropdown-menu active">
                  <button
                    onClick={() => { navigate('/admin'); setMenuOpen(false); }}
                    className="dropdown-item"
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </button>
                  <button
                    onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                    className="dropdown-item"
                  >
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => { toggle(); setMenuOpen(false); }}
                    className="dropdown-item"
                  >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    onClick={() => { logout(); navigate('/'); setMenuOpen(false); }}
                    className="dropdown-item sign-out"
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
              className="search-button"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
