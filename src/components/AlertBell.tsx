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
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    getAlerts(token).then(data => {
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
    }).catch(err => console.error('getAlerts failed', err));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      getAlerts(token).then(data => {
        setAlerts(data.alerts);
        setUnreadCount(data.unreadCount);
      }).catch(err => console.error('getAlerts failed', err))
      .finally(() => { fetchingRef.current = false; });
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
        <div className="alerts-dropdown">
          <div className="alerts-header">Alerts</div>
          {alerts.length === 0 ? (
            <div className="alerts-empty">No alerts yet</div>
          ) : (
            <div>
              {alerts.slice(0, 20).map(alert => (
                <button
                  key={alert.id}
                  onClick={() => handleMarkRead(alert.id)}
                  className={`alert-item ${!alert.read ? 'unread' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!alert.read && (
                      <span className="alert-dot" />
                    )}
                    <div className="min-w-0">
                      <p className="alert-message">{alert.message}</p>
                      <p className="alert-time">{formatTime(alert.triggered_at)}</p>
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
