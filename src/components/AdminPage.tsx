import { useState, useEffect, useCallback } from 'react';
import { Shield, Users, ScrollText, Timer, Trash2, ChevronLeft, ChevronRight, Search as SearchIcon, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NavHeader from './NavHeader';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';
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
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

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
  const [trialSearch, setTrialSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/');
      return;
    }
    getAdminStats(token)
      .then(setStats)
      .catch(() => showToast('Failed to load stats', 'error'))
      .finally(() => setLoading(false));
  }, [token, user, navigate]);

  const loadUsers = useCallback(async (page = 1, search = '', filter = 'users') => {
    if (!token) return;
    try {
      const data = await getAdminUsers(token, { page, limit: 20, search, filter });
      setUsers(data.users);
      setUsersPage(data.page);
      setUsersTotal(data.total);
      setUsersTotalPages(data.totalPages);
    } catch {
      showToast('Failed to load users', 'error');
    }
  }, [token, showToast]);

  const loadLogs = useCallback(async (page = 1) => {
    if (!token) return;
    try {
      const data = await getAdminAudit(token, { page, limit: 20 });
      setLogs(data.logs);
      setLogsPage(data.page);
      setLogsTotalPages(data.totalPages);
    } catch {
      showToast('Failed to load audit logs', 'error');
    }
  }, [token, showToast]);

  const loadTrials = useCallback(async (page = 1, status = 'all', search = '') => {
    if (!token) return;
    try {
      const data = await getAdminTrials(token, { page, limit: 20, status, search });
      setTrials(data.trials);
      setTrialsPage(data.page);
      setTrialsTotalPages(data.totalPages);
    } catch {
      showToast('Failed to load trials', 'error');
    }
  }, [token, showToast]);

  useEffect(() => {
    if (tab === 'users') loadUsers(1, userSearch, userFilter);
    if (tab === 'audit') loadLogs(1);
    if (tab === 'trials') loadTrials(1, trialsStatus, trialSearch);
  }, [tab]);

  async function handleDeleteUser(userId: string, username: string) {
    if (!token) return;
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      await deleteAdminUser(token, userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`Deleted user ${username}`, 'success');
    } catch {
      showToast('Failed to delete user', 'error');
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!token) return;
    try {
      await setAdminUserRole(token, userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast(`Role changed to ${newRole}`, 'success');
    } catch {
      showToast('Failed to change role', 'error');
    }
  }

  async function handleCleanupTrials() {
    if (!token) return;
    if (!confirm('Delete all expired trial accounts?')) return;
    try {
      const result = await cleanupExpiredTrials(token);
      showToast(`Deleted ${result.deletedCount} expired trials`, 'success');
      loadTrials(1, trialsStatus, trialSearch);
    } catch {
      showToast('Failed to cleanup trials', 'error');
    }
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
        <aside className="admin-sidebar hidden sm:block">
          <div className="admin-sidebar-header">Admin Control</div>
          <nav className="flex flex-col gap-2">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`admin-nav-item ${tab === item.key ? 'active' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="sm:hidden flex gap-1 p-4 overflow-x-auto border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === item.key
                  ? 'text-white'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              style={tab === item.key ? { background: 'var(--primary)', color: 'white' } : { color: 'var(--muted)' }}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="admin-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-primary)', fontSize: '32px', fontWeight: '700', marginBottom: '4px', color: 'var(--text)' }}>
                Dashboard View
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Real-time system health, active database metrics, and subscriber counts.</p>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'rgba(22, 163, 74, 0.1)', color: 'var(--success)', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>
              ● ENGINE ONLINE
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl skeleton animate-pulse" />
              ))}
            </div>
          )}

          {tab === 'dashboard' && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12">
              <StatCard label="Total Users" value={stats.totalUsers} />
              <StatCard label="Active Watchlists" value={stats.totalProducts} />
              <StatCard label="API Requests (24h)" value={stats.totalPrices} />
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadUsers(1, userSearch, userFilter)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <select
                  value={userFilter}
                  onChange={e => { setUserFilter(e.target.value); loadUsers(1, userSearch, e.target.value); }}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="users">Regular Users</option>
                  <option value="trials">Trial Users</option>
                </select>
              </div>

              <p className="text-xs text-zinc-400">{usersTotal} users found</p>

              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{u.username}</p>
                      <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {u.isTrial ? 'Trial' : 'Regular'} · {u.productCount} pinned · {new Date(u.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
              {logs.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">No audit logs yet</p>
              ) : (
                <div className="space-y-2">
                  {logs.map(log => (
                    <div key={log.id} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-accent">{log.action}</span>
                        <span className="text-[10px] text-zinc-400">{formatTime(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                        {log.admin_username} {log.details || ''}
                      </p>
                    </div>
                  ))}
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
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search trials..."
                    value={trialSearch}
                    onChange={e => setTrialSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadTrials(1, trialsStatus, trialSearch)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <select
                  value={trialsStatus}
                  onChange={e => { setTrialsStatus(e.target.value); loadTrials(1, e.target.value, trialSearch); }}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-100"
                >
                  <option value="all">All Trials</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
                <button
                  onClick={handleCleanupTrials}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors"
                >
                  Clean Expired
                </button>
              </div>

              <div className="space-y-2">
                {trials.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                    <div>
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{t.username}</p>
                      <p className="text-xs text-zinc-400">{t.email}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {t.productCount} pinned · Created {new Date(t.createdAt).toLocaleDateString('en-GB')}
                        {t.trialExpiresAt && ` · Expires ${new Date(t.trialExpiresAt).toLocaleDateString('en-GB')}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      t.isExpired
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {t.isExpired ? 'Expired' : 'Active'}
                    </span>
                  </div>
                ))}
              </div>

              {trialsTotalPages > 1 && (
                <Pagination page={trialsPage} totalPages={trialsTotalPages} onChange={p => loadTrials(p, trialsStatus, trialSearch)} />
              )}
            </div>
          )}
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
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
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-zinc-400">{page} / {totalPages}</span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-30 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
