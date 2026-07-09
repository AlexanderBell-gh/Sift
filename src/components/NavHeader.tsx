import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Sun, Moon, Settings, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import AlertBell from './AlertBell';

interface NavHeaderProps {
  title?: string;
  showBack?: boolean;
}

function formatTrialTime(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function NavHeader({ title = 'Sift', showBack = false }: NavHeaderProps) {
  const { token, user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [trialCountdown, setTrialCountdown] = useState('');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!user?.isTrial || !user.trialExpiresAt) return;
    function tick() {
      setTrialCountdown(formatTrialTime(user!.trialExpiresAt!));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [user?.isTrial, user?.trialExpiresAt]);

  const isTrial = user?.isTrial === true;
  const displayName = isTrial ? 'Trial User' : (user?.username || 'U');
  const avatarText = isTrial ? 'TU' : (user?.username?.slice(0, 2).toUpperCase() || 'U');

  return (
    <nav className="nav">
      <div className="container" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <a href="/search" className="logo">
            <div className="logo-mark">
              <div className="logo-tag"></div>
              <div className="logo-scan-line"></div>
            </div>
            <div className="logo-text">{title}</div>
          </a>
        </div>

        <div className="nav-links">
          <div className="hidden sm:flex items-center gap-6">
            <button onClick={() => navigate('/search')} className="nav-link">Search</button>
            {token && (
              <button onClick={() => navigate('/watchlist')} className="nav-link">Watchlist</button>
            )}
          </div>

          <AlertBell />

          {token ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} className="user-menu-wrapper">
                {isTrial && <span className="trial-nav-indicator active">TRIAL ACTIVE</span>}
                <div className="user-avatar">{avatarText}</div>
                <span className="user-name hidden sm:inline">{displayName}</span>
                <svg className={`dropdown-arrow transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} viewBox="0 0 10 10" fill="currentColor" width="8" height="8">
                  <path d="M5 7L0 2h10z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="dropdown-menu active">
                  {isTrial && (
                    <div className="dropdown-item trial-dropdown-item">
                      <span>⏳ Trial Left:</span>
                      <span className="trial-countdown">{trialCountdown}</span>
                    </div>
                  )}
                  {!isTrial && user?.role === 'admin' && (
                    <button onClick={() => { navigate('/admin'); setMenuOpen(false); }} className="dropdown-item">
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </button>
                  )}
                  <button onClick={() => { navigate('/settings'); setMenuOpen(false); }} className="dropdown-item">
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                  <button onClick={() => { toggle(); setMenuOpen(false); }} className="dropdown-item">
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <div className="dropdown-divider" />
                  <button onClick={() => { logout(); navigate('/'); setMenuOpen(false); }} className="dropdown-item sign-out">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/')} className="search-button">Sign In</button>
          )}
        </div>
      </div>
    </nav>
  );
}
