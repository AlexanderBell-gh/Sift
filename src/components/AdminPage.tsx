import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Users, ScrollText, Timer, ChevronLeft, ChevronRight, Search as SearchIcon, BarChart3, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import NavHeader from './NavHeader';
import {
  getAdminStats,
  getAdminUsers,
  deleteAdminUser,
  setAdminUserRole,
  getAdminAudit,
  getAdminTrials,
  cleanupExpiredTrials,
} from '../lib/api';
import type { AdminStats, AdminUser, AuditLog, TrialUser } from '../types';

type Tab = 'dashboard' | 'users' | 'audit' | 'trials';

export default function AdminPage() {
  const { token, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersTotalPages, setUsersTotalPages] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('users');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(0);
  const [trials, setTrials] = useState<TrialUser[]>([]);
  const [trialsPage, setTrialsPage] = useState(1);
  const [trialsTotalPages, setTrialsTotalPages] = useState(0);
  const [trialsStatus, setTrialsStatus] = useState('all');

  const [auditFilter, setAuditFilter] = useState('all');
  const [loadingByTab, setLoadingByTab] = useState<Record<Tab, boolean>>({
    dashboard: true,
    users: false,
    audit: false,
    trials: false,
  });
  const [tabLoaded, setTabLoaded] = useState<Record<Tab, boolean>>({
    dashboard: false,
    users: false,
    audit: false,
    trials: false,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!token || user?.role !== 'admin') {
      navigate('/');
      return;
    }
    getAdminStats(token)
      .then(data => {
        setStats(data);
        setTabLoaded(prev => ({ ...prev, dashboard: true }));
      })
      .catch(() => {
        setError('Failed to load stats');
        setTabLoaded(prev => ({ ...prev, dashboard: true }));
      })
      .finally(() => setLoadingByTab(prev => ({ ...prev, dashboard: false })));
  }, [token, user, authLoading, navigate]);

  const loadUsers = useCallback(async (page = 1, search = '', filter = 'users') => {
    if (!token) return;
    setLoadingByTab(prev => ({ ...prev, users: true }));
    try {
      const data = await getAdminUsers(token, { page, limit: 20, search, filter });
      setUsers(data.users);
      setUsersPage(data.page);
      setUsersTotal(data.total);
      setUsersTotalPages(data.totalPages);
      setTabLoaded(prev => ({ ...prev, users: true }));
    } catch {
      setError('Failed to load users');
    } finally {
      setLoadingByTab(prev => ({ ...prev, users: false }));
    }
  }, [token]);

  const loadLogs = useCallback(async (page = 1) => {
    if (!token) return;
    setLoadingByTab(prev => ({ ...prev, audit: true }));
    try {
      const data = await getAdminAudit(token, { page, limit: 20 });
      setLogs(data.logs);
      setLogsPage(data.page);
      setLogsTotalPages(data.totalPages);
      setTabLoaded(prev => ({ ...prev, audit: true }));
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoadingByTab(prev => ({ ...prev, audit: false }));
    }
  }, [token]);

  const loadTrials = useCallback(async (page = 1, status = 'all') => {
    if (!token) return;
    setLoadingByTab(prev => ({ ...prev, trials: true }));
    try {
      const data = await getAdminTrials(token, { page, limit: 20, status });
      setTrials(data.trials);
      setTrialsPage(data.page);
      setTrialsTotalPages(data.totalPages);
      setTabLoaded(prev => ({ ...prev, trials: true }));
    } catch {
      setError('Failed to load trials');
    } finally {
      setLoadingByTab(prev => ({ ...prev, trials: false }));
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- idiomatic fetch-on-tab-change; loaders set their loading flag synchronously
    if (tab === 'users') loadUsers(1, userSearch, userFilter);
    if (tab === 'audit') loadLogs(1);
    if (tab === 'trials') loadTrials(1, trialsStatus);
  }, [tab, loadUsers, loadLogs, loadTrials, userSearch, userFilter, trialsStatus]);

  // audit filter re-fetch handled inline in filter pill onClick

  async function handleDeleteUser(userId: string, username: string) {
    if (!token) return;
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      await deleteAdminUser(token, userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setError('');
    } catch {
      setError('Failed to delete user');
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!token) return;
    try {
      await setAdminUserRole(token, userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setError('');
    } catch {
      setError('Failed to change role');
    }
  }

  async function handleCleanupTrials() {
    if (!token) return;
    const expiredCount = trials.filter(t => t.isExpired).length;
    if (expiredCount === 0) {
      setError('No expired trials to clean');
      return;
    }
    if (!confirm(`Delete ${expiredCount} expired trial account${expiredCount === 1 ? '' : 's'}?`)) return;
    try {
      await cleanupExpiredTrials(token);
      setError('');
      loadTrials(1, trialsStatus);
    } catch {
      setError('Failed to cleanup trials');
    }
  }

  const navItems: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: 'dashboard', label: 'Stats Dashboard', icon: BarChart3 },
    { key: 'users', label: 'User Management', icon: Users },
    { key: 'audit', label: 'Audit Logs', icon: ScrollText },
    { key: 'trials', label: 'Trials', icon: Timer },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <NavHeader />

      <div className="admin-grid">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">Admin Control</div>
          <nav className="flex flex-col gap-2">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`admin-nav-item ${tab === item.key ? 'active' : ''}`}
                aria-label={item.label}
                aria-current={tab === item.key ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="admin-content">
          <div className="admin-heading-row">
            <div>
              <h1>
                {tab === 'dashboard' && 'System Stats'}
                {tab === 'users' && 'User Accounts'}
                {tab === 'audit' && 'Audit Logs'}
                {tab === 'trials' && 'Trial Management'}
              </h1>
              <p className="admin-subtitle">
                {tab === 'dashboard' && 'Real-time system health, active database metrics, and subscriber counts.'}
                {tab === 'users' && 'Manage system privileges and active profiles.'}
                {tab === 'audit' && 'Track admin actions and system events.'}
                {tab === 'trials' && 'Monitor trial accounts and expiration status.'}
              </p>
            </div>
            {tab === 'dashboard' && (
              <div className="engine-badge">
                ● ENGINE ONLINE
              </div>
            )}
          </div>

          {error && (
            <div className="auth-error mb-6" role="alert">
              {error}
            </div>
          )}

          {loadingByTab['dashboard'] && !tabLoaded['dashboard'] && tab === 'dashboard' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl skeleton animate-pulse" />
              ))}
            </div>
          )}

          {loadingByTab[tab] && !tabLoaded[tab] && tab !== 'dashboard' && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl skeleton animate-pulse" />
              ))}
            </div>
          )}

          {tab === 'dashboard' && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12">
              <StatCard label="Total Users" value={stats.totalUsers} />
              <StatCard label="Regular Users" value={stats.regularUsers} />
              <StatCard label="Trial Users" value={stats.trialUsers} />
              <StatCard label="Tracked Products" value={stats.totalProducts} />
              <StatCard label="Recent Signups (7d)" value={stats.recentSignups7d} />
              <StatCard label="Tracked Stores" value={stats.trackedStores} />
            </div>
          )}

          {tab === 'dashboard' && !loadingByTab['dashboard'] && !stats && (
            <div className="empty-state-box">
              <p className="empty-state-title">Stats unavailable</p>
              <p className="empty-state-desc">Could not load dashboard statistics. Try refreshing the page.</p>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchIcon className="search-icon-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadUsers(1, userSearch, userFilter)}
                    className="admin-input"
                  />
                </div>
                <div className="flex-shrink-0">
                  <AdminSelect
                    value={userFilter}
                    onChange={val => { setUserFilter(val); loadUsers(1, userSearch, val); }}
                    options={[
                      { value: 'users', label: 'Regular Users' },
                      { value: 'trials', label: 'Trial Users' },
                    ]}
                  />
                </div>
              </div>

              <p className="admin-meta">{usersTotal} users found</p>

              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="user-row-card">
                    <div className="user-profile-meta">
                      <div className="user-row-avatar">{u.username.slice(0, 2).toUpperCase()}</div>
                      <div className="user-identity">
                        <span className="user-row-name">{u.username}</span>
                        <span className="user-row-email">{u.email}</span>
                      </div>
                    </div>
                    <div className="user-row-date">Joined {new Date(u.createdAt).toLocaleDateString('en-GB')}</div>
                    <div>
                      <span className={`user-badge-role ${u.role === 'admin' ? 'user-badge-admin' : 'user-badge-user'}`}>{u.role}</span>
                    </div>
                     <div className="user-action-cell">
                       <div className="w-40">
                         <AdminSelect
                           size="small"
                           value={u.role}
                           onChange={val => handleRoleChange(u.id, val)}
                           options={[
                             { value: 'user', label: 'Standard User' },
                             { value: 'admin', label: 'Administrator' },
                           ]}
                         />
                       </div>
                       <button
                         onClick={() => handleDeleteUser(u.id, u.username)}
                         className="user-row-delete-btn"
                         aria-label={`Delete user ${u.username}`}
                       >
                         ✕
                       </button>
                     </div>
                  </div>
                ))}
              </div>

              {usersTotalPages > 1 && (
                <Pagination page={usersPage} totalPages={usersTotalPages} onChange={p => loadUsers(p, userSearch, userFilter)} />
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div className="space-y-4">
              <div className="audit-filter-pills">
                {[
                  { key: 'all', label: 'All Events' },
                  { key: 'system', label: 'System' },
                  { key: 'trial', label: 'Trial' },
                  { key: 'security', label: 'Security' },
                  { key: 'delete', label: 'Admin Revokes' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setAuditFilter(f.key); loadLogs(1); }}
                    className={`audit-pill ${auditFilter === f.key ? 'active' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {logs.length === 0 && !loadingByTab['audit'] ? (
                <div className="audit-empty">
                  <p className="audit-empty-title">No audit logs yet</p>
                  <p className="audit-empty-desc">Audit entries appear when admin actions are taken</p>
                </div>
              ) : (
                <div className="audit-console">
                  {logs
                    .filter(log => auditFilter === 'all' || log.action?.toLowerCase().includes(auditFilter))
                    .map(log => {
                      const time = new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      const actionLower = log.action?.toLowerCase() || '';
                      let tagClass = 'tag-system';
                      let tagLabel = 'SYSTEM';
                      if (actionLower.includes('trial')) { tagClass = 'tag-trial'; tagLabel = 'TRIAL'; }
                      else if (actionLower.includes('security') || actionLower.includes('auth') || actionLower.includes('token')) { tagClass = 'tag-security'; tagLabel = 'SECURITY'; }
                      else if (actionLower.includes('delete') || actionLower.includes('revoke')) { tagClass = 'tag-delete'; tagLabel = 'DELETE'; }

                      return (
                        <div key={log.id} className="audit-row">
                          <span className="audit-time">[{time}]</span>
                          <span className={`audit-tag ${tagClass}`}>{tagLabel}</span>
                          <span className="audit-message">
                            {log.admin_username} {log.details || log.action}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              {logsTotalPages > 1 && (
                <Pagination page={logsPage} totalPages={logsTotalPages} onChange={loadLogs} />
              )}
            </div>
          )}

          {tab === 'trials' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-shrink-0">
                  <AdminSelect
                    value={trialsStatus}
                    onChange={val => { setTrialsStatus(val); loadTrials(1, val); }}
                    options={[
                      { value: 'all', label: 'All Trials' },
                      { value: 'active', label: 'Active' },
                      { value: 'expired', label: 'Expired' },
                    ]}
                  />
                </div>
                <button
                  onClick={handleCleanupTrials}
                  className="btn-danger"
                >
                  Clean Expired
                </button>
              </div>

              <div className="space-y-2">
                {trials.map(t => (
                  <div key={t.id} className="trial-card">
                    <div>
                      <p className="trial-card-name">{t.username}</p>
                      <p className="trial-card-email">{t.email}</p>
                      <p className="trial-card-meta">
                        {t.productCount} pinned · Created {new Date(t.createdAt).toLocaleDateString('en-GB')}
                        {t.trialExpiresAt && ` · Expires ${new Date(t.trialExpiresAt).toLocaleDateString('en-GB')}`}
                      </p>
                    </div>
                    <span className={`trial-status ${t.isExpired ? 'trial-status-expired' : 'trial-status-active'}`}>
                      {t.isExpired ? 'Expired' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>

              {trialsTotalPages > 1 && (
                <Pagination page={trialsPage} totalPages={trialsTotalPages} onChange={p => loadTrials(p, trialsStatus)} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value.toLocaleString()}</span>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  return (
    <div className="pagination-wrap">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="pagination-btn"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="pagination-label">{page} / {totalPages}</span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="pagination-btn"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function AdminSelect({
  value,
  onChange,
  options,
  className,
  size = 'default',
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  size?: 'default' | 'small';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`admin-dropdown-trigger ${size === 'small' ? 'admin-dropdown-trigger--small' : ''} ${open ? 'open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current?.label ?? 'Select'}</span>
        <ChevronDown className="chevron w-4 h-4" />
      </button>
      {open && (
        <div className="admin-select-menu" role="listbox">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`dropdown-item ${opt.value === value ? 'active' : ''}`}
            >
              <span className="flex-1">{opt.label}</span>
              {opt.value === value && <Check className="w-4 h-4 text-primary" strokeWidth={3} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
