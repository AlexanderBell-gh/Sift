import { useState } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, Shield, Key, FileDown, AlertTriangle } from 'lucide-react';
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
    <div className="min-h-screen bg-bg">
      <NavHeader />
      <div className="container py-12">
        <div className="mb-8">
          <h2 className="page-title">
            Account Settings
          </h2>
          <p className="text-sm text-muted mt-2">
            Manage your credentials, watchlist data, and account preferences
          </p>
        </div>

        {isTrial && (
          <section className="settings-card trial-card mb-5">
            <div className="settings-card-header">
              <div className="settings-card-header-icon primary">
                <Shield size={20} className="text-accent" />
              </div>
              <div>
                <h3>Trial Account</h3>
                <p>
                  {user?.trialExpiresAt ? `Expires ${new Date(user.trialExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : '24-hour trial active'}
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="settings-grid">
          {!isTrial && (
            <section className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-header-icon primary">
                  <Shield size={20} className="text-accent" />
                </div>
                <div>
                  <h3>Personal Details</h3>
                  <p>Your account identifiers</p>
                </div>
              </div>
              <div className="form-group mt-2">
                <label className="field-label">Full Name</label>
                <input type="text" className="form-input opacity-75" value={user?.username || ''} disabled />
              </div>
              <div className="form-group">
                <label className="field-label">Email Address</label>
                <input type="email" className="form-input opacity-75" value={user?.email || ''} disabled />
              </div>
            </section>
          )}

          {!isTrial && (
            <section className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-header-icon primary">
                  <Key size={20} className="text-accent" />
                </div>
                <div>
                  <h3>Change Password</h3>
                  <p>Update your account password</p>
                </div>
              </div>
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 mt-2">
                <div className="form-group">
                  <label className="field-label">Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="field-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="field-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                {passwordError && (
                  <p className="danger-text text-sm">{passwordError}</p>
                )}
                <button type="submit" className="btn-primary self-start" disabled={isLoading}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </section>
          )}

          {!isTrial && (
            <section className="settings-card full-width">
              <div className="settings-card-header">
                <div className="settings-card-header-icon primary">
                  <FileDown size={20} className="text-accent" />
                </div>
                <div>
                  <h3>Data Management</h3>
                  <p>Export your watchlist data as CSV</p>
                </div>
              </div>
              <div className="mt-2">
                <button className="btn-primary" onClick={handleExportDownload} disabled={exportLoading}>
                  {exportLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download Watchlist CSV
                </button>
              </div>
            </section>
          )}

          <section className="settings-card full-width danger-border">
            <div className="settings-card-header">
              <div className="settings-card-header-icon danger">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <div>
                <h3 className="danger-text">Account Deletion</h3>
                <p>Permanently delete your account and all data</p>
              </div>
            </div>
            <div className="mt-2">
              <button className="btn-danger" onClick={() => setIsDeleteModalOpen(true)}>
                Delete Account
              </button>
            </div>
          </section>
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Account">
        <p className="text-sm text-muted">
          This will permanently delete your account, watchlist, and all associated data. This action cannot be undone.
        </p>
        {!isTrial && (
          <div className="form-group mt-2">
            <label className="field-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              required
            />
          </div>
        )}
        {deleteError && <p className="danger-text text-sm">{deleteError}</p>}
        <div className="flex gap-3 mt-2">
          <button className="btn-secondary flex-1" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </button>
          <button className="btn-danger flex-1" onClick={handleDeleteAccount} disabled={isLoading}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Delete Account'}
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}

function generateCSV(items: WatchlistItem[]): string {
  const headers = ['Product Name', 'Store', 'Normal Price', 'Loyalty Price', 'Unit', 'Unit Price', 'Loyalty Type', 'On Offer', 'Offer Expires', 'Offer Deal', 'URL', 'Notes', 'Created', 'Updated'];
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
    escapeCSV(i.offer_deal ?? ''),
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
