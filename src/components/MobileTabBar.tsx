import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bookmark, ShoppingCart } from 'lucide-react';
import { cn } from '../lib/utils';

interface MobileTabBarProps {
  alerts: ReactNode;
}

const TABS = [
  { path: '/', label: 'Search', Icon: Search },
  { path: '/watchlist', label: 'Watchlist', Icon: Bookmark },
  { path: '/list', label: 'Shopping List', Icon: ShoppingCart },
] as const;

export default function MobileTabBar({ alerts }: MobileTabBarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('has-tabbar');
    return () => {
      document.body.classList.remove('has-tabbar');
    };
  }, []);

  return (
    <nav className="mobile-tabbar" aria-label="Primary">
      {TABS.map(({ path, label, Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn('tabbar-item', active && 'tabbar-item-active')}
          >
            <Icon size={22} aria-hidden="true" />
          </button>
        );
      })}
      <div className="tabbar-item tabbar-alerts">{alerts}</div>
    </nav>
  );
}
