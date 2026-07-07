import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';
import NavHeader from './NavHeader';
import { updatePassword, deleteAccount, getWatchlist } from '../lib/api';
import type { WatchlistItem } from '../types';

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const isTrial = user?.isTrial === true;

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  if (!token) {
    navigate('/auth', { replace: true });
    return null;
  }
  const t = token;

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(t, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully', 'success');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    if (!isTrial && !deletePassword) {
      setDeleteError('Please enter your password');
      return;
    }
    setIsLoading(true);
    try {
      await deleteAccount(t, isTrial ? undefined : deletePassword);
      showToast('Account deleted', 'success');
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportDownload() {
    setExportLoading(true);
    try {
      const items = await getWatchlist(t);
      const csv = generateCSV(items);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sift-watchlist-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${items.length} watchlist items`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <NavHeader title="Settings" showBack />
      <div className="container" style={{ paddingTop: '48px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: '700' }}>Account Settings</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Update Sift profiles, configurations and secure sandboxing metrics</p>
        </div>

        <div className="settings-grid">
          <section className="settings-card">
            <h3>Personal Details</h3>
            <p>Modify credentials and basic system identifiers.</p>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="form-input" value={user?.username || ''} disabled style={{ opacity: 0.75 }} />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.75 }} />
            </div>
            <button className="auth-submit" style={{ margin: 0 }} onClick={() => showToast('Profile saving simulated.', 'success')}>Save Changes</button>
          </section>

          {!isTrial && (
            <section className="settings-card">
              <h3>Change Password</h3>
              <p>Manage standard warning protocols and live inflation metrics limits.</p>
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                <button type="submit" className="auth-submit" style={{ background: 'var(--text)', color: 'var(--surface)' }} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
                </button>
              </form>
            </section>
          )}

          {!isTrial && (
            <section className="settings-card">
              <h3>Data Management</h3>
              <p>Export your watchlist data in CSV format.</p>
              <button className="auth-submit" style={{ background: 'var(--text)', color: 'var(--surface)' }} onClick={handleExportDownload} disabled={exportLoading}>
                {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 inline mr-2" />}
                Download Watchlist CSV
              </button>
            </section>
          )}

          <section className="settings-card full-width danger-border">
            <h3 className="danger-zone-title">
              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Danger Zone
            </h3>
            <p>Irreversible deletion procedures on subscription records and cached watchlists.</p>
            <div>
              <button className="auth-submit" style={{ background: 'var(--danger)', margin: 0 }} onClick={() => setIsDeleteModalOpen(true)}>
                Teardown Subscription & Assets
              </button>
            </div>
          </section>
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Account" className="max-w-sm">
        <div className="p-6 space-y-4">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Are you sure you want to delete your account? This action cannot be undone.
          </p>
          {!isTrial && (
            <div className="form-group">
              <label>Enter your password to confirm</label>
              <input
                type="password"
                className="form-input"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                required
              />
            </div>
          )}
          {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}
          <div className="flex gap-2 pt-2">
            <button className="auth-submit" style={{ background: 'var(--text)', color: 'var(--surface)', flex: 1 }} onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </button>
            <button className="auth-submit" style={{ background: 'var(--danger)', flex: 1 }} onClick={handleDeleteAccount} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}

function generateCSV(items: WatchlistItem[]): string {
  const headers = ['Product Name', 'Store', 'Normal Price', 'Loyalty Price', 'Unit', 'Unit Price', 'Loyalty Type', 'On Offer', 'Offer Expires', 'URL', 'Notes', 'Created', 'Updated'];
  const rows = items.map(i => [
    escapeCSV(i.product_name),
    escapeCSV(i.store),
    i.prices.normal?.toFixed(2) ?? '',
    i.prices.loyalty?.toFixed(2) ?? '',
    escapeCSV(i.unit ?? ''),
    i.prices.unit_price?.toFixed(2) ?? '',
    escapeCSV(i.loyalty_type ?? ''),
    i.is_on_offer ? 'Yes' : 'No',
    escapeCSV(i.offer_expires_at ?? ''),
    escapeCSV(i.product_url),
    escapeCSV(i.notes ?? ''),
    new Date(i.created_at).toISOString(),
    new Date(i.updated_at).toISOString(),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
