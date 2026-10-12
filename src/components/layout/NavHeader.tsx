import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, ArrowLeft, Sun, Moon, Settings, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import AlertBell from '../features/alerts/AlertBell';
import MobileTabBar from './MobileTabBar';

interface NavHeaderProps {
  title?: string;
  showBack?: boolean;
  /** Mobile only: header scrolls away instead of sticking (watchlist). */
  staticNav?: boolean;
}

function formatTrialTime(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function NavHeader({ title = 'Sift', showBack = false, staticNav = false }: NavHeaderProps) {
  const { token, user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuCloseTimer = useRef<number | undefined>(undefined);
  const [trialCountdown, setTrialCountdown] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  useEffect(() => () => window.clearTimeout(menuCloseTimer.current), []);

  function closeMenu() {
    if (!menuOpen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMenuOpen(false);
      return;
    }
    setMenuClosing(true);
    menuCloseTimer.current = window.setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
    }, 200);
  }

  function toggleMenu() {
    if (menuOpen) {
      closeMenu();
      return;
    }
    window.clearTimeout(menuCloseTimer.current);
    setMenuClosing(false);
    setMenuOpen(true);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const el = e.target as Element;
      // Menu renders in a body portal (see below), so ref containment does
      // not cover it: match by class instead.
      if (el.closest?.('.user-menu-wrapper, .dropdown-menu')) return;
      closeMenu();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  });

  // Mobile sheet: lock body scroll while the account menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia('(max-width: 640px)');
    function apply() {
      document.body.style.overflow = mq.matches ? 'hidden' : '';
    }
    apply();
    mq.addEventListener('change', apply);
    return () => {
      document.body.style.overflow = '';
      mq.removeEventListener('change', apply);
    };
  }, [menuOpen]);

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!user?.isTrial || user.trialExpiresAt == null) return;
    const expiresAt: number = user.trialExpiresAt;
    function tick() {
      setTrialCountdown(formatTrialTime(expiresAt));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [user?.isTrial, user?.trialExpiresAt, user]);

  const isTrial = user?.isTrial === true;
  const displayName = isTrial ? 'Trial User' : (user?.username || 'U');
  const avatarText = isTrial ? 'TU' : (user?.username?.slice(0, 2).toUpperCase() || 'U');

  return (
    <>
    <nav className={staticNav ? 'nav nav-static' : 'nav'}>
      <div className="container nav-inner">
        <div className="nav-cluster">
          {showBack && (
            <button
              onClick={() => navigate('/')}
              className="icon-btn-sm"
            >
              <ArrowLeft className="icon-md" />
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

        <div className="nav-links">
          <div className="hidden sm:flex items-center gap-6">
            {token && (
              <>
                <button onClick={() => navigate('/')} className="nav-link">Search</button>
                <button onClick={() => navigate('/watchlist')} className="nav-link">Watchlist</button>
                <button onClick={() => navigate('/list')} className="nav-link">Shopping List</button>
              </>
            )}
          </div>

          {token && !isMobile && (
          <div className="mobile-menu-wrap" ref={mobileMenuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="icon-btn"
            >
              {mobileMenuOpen ? <X className="icon-md" /> : <Menu className="icon-md" />}
            </button>
            {mobileMenuOpen && (
              <div className="mobile-menu-pop">
                <button onClick={() => { navigate('/'); setMobileMenuOpen(false); }} className="dropdown-item">Search</button>
                <button onClick={() => { navigate('/watchlist'); setMobileMenuOpen(false); }} className="dropdown-item">Watchlist</button>
                <button onClick={() => { navigate('/list'); setMobileMenuOpen(false); }} className="dropdown-item">Shopping List</button>
              </div>
            )}
          </div>
          )}

          {!isMobile && <AlertBell />}

          {!token && (
          <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="icon-btn"
          >
            {isDark ? <Sun className="icon-md" /> : <Moon className="icon-md" />}
          </button>
          )}

          {token ? (
            <div className="relative">
              <button onClick={toggleMenu} className="user-menu-wrapper">
                {isTrial && <span className="trial-nav-indicator active">TRIAL ACTIVE</span>}
                <div className="user-avatar">{avatarText}</div>
                <span className="user-name hidden sm:inline">{displayName}</span>
                <svg className={`dropdown-arrow transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} viewBox="0 0 10 10" fill="currentColor" width="8" height="8">
                  <path d="M5 7L0 2h10z" />
                </svg>
              </button>

              {menuOpen && (isMobile ? createPortal(
                <>
                <div className={`user-menu-backdrop${menuClosing ? ' is-closing' : ''}`} onClick={closeMenu} aria-hidden="true" />
                <div className={`dropdown-menu active${menuClosing ? ' is-closing' : ''}`}>
                  {isTrial && (
                    <div className="dropdown-item trial-dropdown-item">
                      <span>⏳ Trial Left:</span>
                      <span className="trial-countdown">{trialCountdown}</span>
                    </div>
                  )}
                  {!isTrial && user?.role === 'admin' && (
                    <button onClick={() => { navigate('/admin'); closeMenu(); }} className="dropdown-item">
                      <Shield className="icon-sm" />
                      Admin Panel
                    </button>
                  )}
                  <button onClick={() => { navigate('/settings'); closeMenu(); }} className="dropdown-item">
                    <Settings className="icon-sm" />
                    Account Settings
                  </button>
                  <button onClick={() => { toggle(); closeMenu(); }} className="dropdown-item">
                    {isDark ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <div className="dropdown-divider" />
                  <button onClick={() => { logout(); navigate('/'); closeMenu(); }} className="dropdown-item sign-out">
                    <LogOut className="icon-sm" />
                    Sign out
                  </button>
                </div>
                </>,
                document.body
              ) : (
                <div className={`dropdown-menu active${menuClosing ? ' is-closing' : ''}`}>
                  {isTrial && (
                    <div className="dropdown-item trial-dropdown-item">
                      <span>⏳ Trial Left:</span>
                      <span className="trial-countdown">{trialCountdown}</span>
                    </div>
                  )}
                  {!isTrial && user?.role === 'admin' && (
                    <button onClick={() => { navigate('/admin'); closeMenu(); }} className="dropdown-item">
                      <Shield className="icon-sm" />
                      Admin Panel
                    </button>
                  )}
                  <button onClick={() => { navigate('/settings'); closeMenu(); }} className="dropdown-item">
                    <Settings className="icon-sm" />
                    Account Settings
                  </button>
                  <button onClick={() => { toggle(); closeMenu(); }} className="dropdown-item">
                    {isDark ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <div className="dropdown-divider" />
                  <button onClick={() => { logout(); navigate('/'); closeMenu(); }} className="dropdown-item sign-out">
                    <LogOut className="icon-sm" />
                    Sign out
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={() => navigate('/auth')} className="user-menu-wrapper" aria-label="Sign in">
              <div className="user-avatar">
                <LogIn className="icon-sm" />
              </div>
              <span className="user-name hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </nav>
    {token && isMobile && <MobileTabBar alerts={<AlertBell />} />}
    </>
  );
}
