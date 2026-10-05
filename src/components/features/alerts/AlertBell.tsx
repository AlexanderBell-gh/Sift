import { useState, useEffect, useRef, useCallback } from 'react';
import type { TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Trash2, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../contexts/AuthContext';
import { getAlerts, markAlertRead, markAllAlertsRead, deleteAlert } from '../../../lib/api';
import { formatTimeAgo } from '../../../lib/utils';
import type { Alert } from '../../../types';

const SWIPE_THRESHOLD = 60;

interface AlertRowProps {
  alert: Alert;
  onMarkRead: (id: string) => void;
  onOpen: (alert: Alert) => void;
  onDismiss: (id: string) => void;
}

function AlertRow({ alert, onMarkRead, onOpen, onDismiss }: AlertRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const locked = useRef<'x' | 'y' | null>(null);
  const offset = useRef(0);
  const swiped = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
  }

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    startX.current = e.touches[0]?.clientX ?? null;
    startY.current = e.touches[0]?.clientY ?? null;
    locked.current = null;
    offset.current = 0;
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    const el = ref.current;
    const touch = e.touches[0];
    if (!el || startX.current === null || startY.current === null || !touch) return;
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    if (locked.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (locked.current !== 'x' || dx >= 0) return;
    offset.current = dx;
    el.style.transition = 'none';
    el.style.transform = `translateX(${Math.max(dx, -120)}px)`;
    el.style.opacity = `${1 + dx / 300}`;
  }

  function handleTouchEnd() {
    const el = ref.current;
    startX.current = null;
    startY.current = null;
    if (locked.current === 'x' && offset.current < -SWIPE_THRESHOLD && el) {
      swiped.current = true;
      el.style.transition = 'transform 180ms ease, opacity 180ms ease';
      el.style.transform = 'translateX(-100%)';
      el.style.opacity = '0';
      navigator.vibrate?.(10);
      timer.current = window.setTimeout(() => onDismiss(alert.id), 180);
    } else {
      reset();
    }
    locked.current = null;
    offset.current = 0;
  }

  return (
    <div className="alert-swipe">
      <span className="alert-swipe-bg" aria-hidden="true">
        <Trash2 className="icon-sm" />
      </span>
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
          if (!alert.read) onMarkRead(alert.id);
          onOpen(alert);
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
      <button
        className="alert-dismiss"
        onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
        title="Dismiss"
        aria-label="Dismiss alert"
      >
        <X className="icon-sm" />
      </button>
      </div>
    </div>
  );
}

export default function AlertBell() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  function openPanel() {
    window.clearTimeout(closeTimer.current);
    setIsClosing(false);
    setOpen(true);
  }

  function closePanel() {
    if (!open) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpen(false);
      return;
    }
    setIsClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 200);
  }
  const [loadError, setLoadError] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  );
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const refreshAlerts = useCallback(async () => {
    if (!token || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await getAlerts(token);
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
      setLoadError(false);
    } catch (err) {
      console.error('getAlerts failed', err);
      setLoadError(true);
    } finally {
      fetchingRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getAlerts(token).then(data => {
      if (cancelled) return;
      setAlerts(data.alerts);
      setUnreadCount(data.unreadCount);
      setLoadError(false);
    }).catch(err => {
      if (cancelled) return;
      console.error('getAlerts failed', err);
      setLoadError(true);
    });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token || open) return;
    const interval = setInterval(refreshAlerts, 60000);
    return () => clearInterval(interval);
  }, [token, open, refreshAlerts]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closePanel();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  });

  useEffect(() => {
    if (!open || !isMobile) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, isMobile]);

  if (!token) return null;

  async function handleMarkRead(id: string) {
    if (!token) return;
    const alert = alerts.find(a => a.id === id);
    if (!alert || alert.read) return;
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await markAlertRead(token, id);
    } catch (err) {
      console.error('markAlertRead failed', err);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: false } : a));
      setUnreadCount(prev => prev + 1);
    }
  }

  async function handleMarkAllRead() {
    if (!token || unreadCount === 0) return;
    const prevAlerts = alerts;
    const prevUnread = unreadCount;
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setUnreadCount(0);
    try {
      await markAllAlertsRead(token);
    } catch (err) {
      console.error('markAllAlertsRead failed', err);
      setAlerts(prevAlerts);
      setUnreadCount(prevUnread);
    }
  }

  function handleOpen(alert: Alert) {
    closePanel();
    navigate(`/watchlist?item=${encodeURIComponent(alert.watchlist_id)}`);
  }

  async function handleDismiss(id: string) {
    if (!token) return;
    const removed = alerts.find(a => a.id === id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    if (removed && !removed.read) setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await deleteAlert(token, id);
    } catch (err) {
      console.error('deleteAlert failed', err);
      if (removed) {
        setAlerts(prev => {
          const next = [...prev, removed];
          next.sort((a, b) => b.triggered_at - a.triggered_at);
          return next;
        });
        if (!removed.read) setUnreadCount(prev => prev + 1);
      }
    }
  }

  const panel = (
    <>
      <div className={cn('alerts-backdrop', isClosing && 'is-closing')} onClick={closePanel} />
      <div ref={panelRef} className={cn('alerts-dropdown', isClosing && 'is-closing')} role="dialog" aria-label="Alerts">
        <div className="alerts-header">
          <span>Alerts</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="filter-panel-action"
            >
              Mark all as read
            </button>
          )}
        </div>
        <p className="alerts-swipe-hint">Swipe to dismiss</p>
        {loadError && alerts.length === 0 ? (
          <div className="alerts-empty">Failed to load alerts</div>
        ) : alerts.length === 0 ? (
          <div className="alerts-empty">No alerts yet</div>
        ) : (
          <div>
            {alerts.slice(0, 20).map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onMarkRead={handleMarkRead}
                onOpen={handleOpen}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (open ? closePanel() : openPanel())}
        className="relative icon-btn"
        title="Alerts"
        aria-label="Alerts"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="icon-sm" />
        {unreadCount > 0 && (
          <span className="alert-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (isMobile ? createPortal(panel, document.body) : panel)}
    </div>
  );
}
