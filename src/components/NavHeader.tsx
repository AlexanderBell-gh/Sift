import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft, Sun, Moon, Settings, Shield, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import AlertBell from './AlertBell';

const STORES = ['Tesco', "Sainsbury's", 'ASDA', 'Morrisons', 'M&S', 'Aldi', 'Lidl'];
const CATEGORIES = ['Chilled', 'Snacks', 'Beverages', 'Produce', 'Frozen', 'Bakery', 'Food Cupboard'];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'store_asc', label: 'Store A-Z' },
] as const;

interface NavHeaderProps {
  title?: string;
  showBack?: boolean;
  selectedStores?: string[];
  onStoresChange?: (stores: string[]) => void;
  selectedCategories?: string[];
  onCategoriesChange?: (categories: string[]) => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
}

function formatTrialTime(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return '00:00:00';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function NavHeader({ title = 'Sift', showBack = false, selectedStores, onStoresChange, selectedCategories, onCategoriesChange, sortBy, onSortChange }: NavHeaderProps) {
  const { token, user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [trialCountdown, setTrialCountdown] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  const hasFilters = selectedStores && onStoresChange && sortBy && onSortChange;
  const filteredCount = selectedStores?.length ?? STORES.length;

  function toggleStore(store: string) {
    if (!onStoresChange || !selectedStores) return;
    if (selectedStores.includes(store)) {
      onStoresChange(selectedStores.filter(s => s !== store));
    } else {
      onStoresChange([...selectedStores, store]);
    }
  }

  function toggleCategory(category: string) {
    if (!onCategoriesChange || !selectedCategories) return;
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  }

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

          <div className="sm:hidden relative" ref={mobileMenuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border py-1 z-50" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <button onClick={() => { navigate('/search'); setMobileMenuOpen(false); }} className="dropdown-item">Search</button>
                {token && (
                  <button onClick={() => { navigate('/watchlist'); setMobileMenuOpen(false); }} className="dropdown-item">Watchlist</button>
                )}
              </div>
            )}
          </div>

          {hasFilters && (
            <div ref={filterRef} className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                title="Filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true"><path d="M10 5H3"></path><path d="M12 19H3"></path><path d="M14 3v4"></path><path d="M16 17v4"></path><path d="M21 12h-9"></path><path d="M21 19h-5"></path><path d="M21 5h-7"></path><path d="M8 10v4"></path><path d="M8 12H3"></path></svg>
                {filteredCount < STORES.length && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold px-1">
                    {filteredCount}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="alerts-dropdown">
                  <div className="alerts-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Filters</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onStoresChange?.(STORES)}
                        className="text-xs transition-colors"
                        style={{ color: filteredCount === STORES.length ? 'var(--muted)' : 'var(--primary)' }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => onStoresChange?.([])}
                        className="text-xs transition-colors"
                        style={{ color: filteredCount === 0 ? 'var(--muted)' : 'var(--primary)' }}
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Stores</div>
                    {STORES.map(store => (
                      <label
                        key={store}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', color: 'var(--text)' }}
                        className="hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStores?.includes(store) ?? true}
                          onChange={() => toggleStore(store)}
                          className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-white/5 text-accent focus:ring-accent focus:ring-offset-0"
                        />
                        {store}
                      </label>
                    ))}
                  </div>
                  {selectedCategories && onCategoriesChange && (
                    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Category</div>
                      {CATEGORIES.map(category => (
                        <label
                          key={category}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', color: 'var(--text)' }}
                          className="hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                            className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 bg-white dark:bg-white/5 text-accent focus:ring-accent focus:ring-offset-0"
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                  )}
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Sort by</div>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => onSortChange?.(e.target.value)}
                        className="w-full appearance-none rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        {SORT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--muted)' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
