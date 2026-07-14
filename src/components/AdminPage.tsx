import { useState, useEffect, useCallback } from 'react';
import { Shield, Users, ScrollText, Timer, ChevronLeft, ChevronRight, Search as SearchIcon, BarChart3 } from 'lucide-react';
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
  const [auditFilter, setAuditFilter] = useState('all');
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
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                {tab === 'dashboard' && 'Real-time system health, active database metrics, and subscriber counts.'}
                {tab === 'users' && 'Manage system privileges and active profiles.'}
                {tab === 'audit' && 'Track admin actions and system events.'}
                {tab === 'trials' && 'Monitor trial accounts and expiration status.'}
              </p>
            </div>
            {tab === 'dashboard' && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'rgba(22, 163, 74, 0.1)', color: 'var(--success)', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>
                ● ENGINE ONLINE
              </div>
            )}
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
              <StatCard label="Regular Users" value={stats.regularUsers} />
              <StatCard label="Trial Users" value={stats.trialUsers} />
              <StatCard label="Active Watchlists" value={stats.totalProducts} />
              <StatCard label="API Requests (24h)" value={stats.totalPrices} />
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadUsers(1, userSearch, userFilter)}
                    className="admin-input"
                    style={{ width: '100%', paddingLeft: '36px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '12px', background: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                  />
                </div>
                <select
                  value={userFilter}
                  onChange={e => { setUserFilter(e.target.value); loadUsers(1, userSearch, e.target.value); }}
                  className="admin-select"
                  style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '12px', background: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                >
                  <option value="users">Regular Users</option>
                  <option value="trials">Trial Users</option>
                </select>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{usersTotal} users found</p>

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
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        className="user-role-select"
                      >
                        <option value="user">Standard User</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="user-row-delete-btn"
                        title="Revoke Account"
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
                    onClick={() => setAuditFilter(f.key)}
                    className={`audit-pill ${auditFilter === f.key ? 'active' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>No audit logs yet</p>
                  <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Audit entries appear when admin actions are taken</p>
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
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
                  <input
                    type="text"
                    placeholder="Search trials..."
                    value={trialSearch}
                    onChange={e => setTrialSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadTrials(1, trialsStatus, trialSearch)}
                    className="admin-input"
                    style={{ width: '100%', paddingLeft: '36px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '12px', background: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                  />
                </div>
                <select
                  value={trialsStatus}
                  onChange={e => { setTrialsStatus(e.target.value); loadTrials(1, e.target.value, trialSearch); }}
                  className="admin-select"
                  style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '12px', background: 'var(--surface)', color: 'var(--text)', fontSize: '14px' }}
                >
                  <option value="all">All Trials</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
                <button
                  onClick={handleCleanupTrials}
                  className="btn-danger"
                  style={{ padding: '10px 16px' }}
                >
                  Clean Expired
                </button>
              </div>

              <div className="space-y-2">
                {trials.map(t => (
                  <div key={t.id} className="trial-card">
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{t.username}</p>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{t.email}</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                        {t.productCount} pinned · Created {new Date(t.createdAt).toLocaleDateString('en-GB')}
                        {t.trialExpiresAt && ` · Expires ${new Date(t.trialExpiresAt).toLocaleDateString('en-GB')}`}
                      </p>
                    </div>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', background: t.isExpired ? 'var(--border)' : 'rgba(22, 163, 74, 0.1)', color: t.isExpired ? 'var(--muted)' : 'var(--success)' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        style={{ padding: '6px', borderRadius: '8px', color: 'var(--muted)', opacity: page <= 1 ? 0.3 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer', background: 'none', border: 'none', transition: 'color 0.2s' }}
      >
        <ChevronLeft style={{ width: '16px', height: '16px' }} />
      </button>
      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{page} / {totalPages}</span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        style={{ padding: '6px', borderRadius: '8px', color: 'var(--muted)', opacity: page >= totalPages ? 0.3 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer', background: 'none', border: 'none', transition: 'color 0.2s' }}
      >
        <ChevronRight style={{ width: '16px', height: '16px' }} />
      </button>
    </div>
  );
}
