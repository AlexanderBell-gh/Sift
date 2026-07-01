import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAlerts, markAlertRead } from '../lib/api';
import type { Alert } from '../types';

export default function AlertBell() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    getAlerts(token).then(data => {
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      getAlerts(token).then(data => {
        setAlerts(data.alerts);
        setUnreadCount(data.unreadCount);
      }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!token) return null;

  async function handleMarkRead(id: string) {
    if (!token) return;
    await markAlertRead(token, id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  function formatTime(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
        title="Alerts"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl shadow-lg z-50">
          <div className="p-3 border-b border-zinc-200 dark:border-white/10">
            <span className="text-sm font-semibold text-zinc-800 dark:text-white">Alerts</span>
          </div>
          {alerts.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-400">No alerts yet</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/5">
              {alerts.slice(0, 20).map(alert => (
                <button
                  key={alert.id}
                  onClick={() => handleMarkRead(alert.id)}
                  className={`w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors ${
                    !alert.read ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!alert.read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-snug">{alert.message}</p>
                      <p className="text-xs text-zinc-400 mt-1">{formatTime(alert.triggered_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
