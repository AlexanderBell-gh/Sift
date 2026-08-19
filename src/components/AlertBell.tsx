import { useState, useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { getAlerts, markAlertRead, deleteAlert } from '../lib/api';
import { formatTimeAgo } from '../lib/utils';
import type { Alert } from '../types';

const SWIPE_THRESHOLD = 60;

interface AlertRowProps {
  alert: Alert;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

function AlertRow({ alert, onMarkRead, onDismiss }: AlertRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const offset = useRef(0);
  const swiped = useRef(false);

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    startX.current = e.touches[0].clientX;
    offset.current = 0;
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    const el = ref.current;
    if (el && startX.current !== null) {
      offset.current = e.touches[0].clientX - startX.current;
      if (offset.current < 0) {
        el.style.transition = 'none';
        el.style.transform = `translateX(${Math.max(offset.current, -100)}px)`;
        el.style.opacity = `${1 + offset.current / 250}`;
      }
    }
  }

  function handleTouchEnd() {
    startX.current = null;
    if (offset.current < -SWIPE_THRESHOLD) {
      swiped.current = true;
      reset();
      onDismiss(alert.id);
    } else {
      reset();
    }
    offset.current = 0;
  }

  return (
    <div
      ref={ref}
      className={`alert-item ${!alert.read ? 'unread' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={reset}
      style={{ transform: 'translateX(0)', transition: 'transform 200ms ease, opacity 200ms ease, background 150ms ease' }}
    >
      <button
        className="alert-body"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          if (alert.read) return;
          onMarkRead(alert.id);
        }}
      >
        {!alert.read && (
          <span className="alert-dot" />
        )}
        <div className="min-w-0">
          <p className="alert-message">{alert.message}</p>
          <p className="alert-time">{formatTimeAgo(alert.triggered_at)}</p>
        </div>
      </button>
      {alert.read && (
        <button
          className="alert-dismiss"
          onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
          title="Dismiss"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

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
    const alert = alerts.find(a => a.id === id);
    if (!alert || alert.read) return;
    await markAlertRead(token, id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function handleDismiss(id: string) {
    if (!token) return;
    await deleteAlert(token, id);
    setAlerts(prev => {
      const removed = prev.find(a => a.id === id);
      if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(a => a.id !== id);
    });
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
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
