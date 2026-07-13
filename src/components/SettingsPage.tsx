import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <NavHeader />
      <div className="container" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 className="page-title" style={{ fontFamily: 'var(--font-primary)', fontSize: '40px', fontWeight: '700', color: 'var(--text)', lineHeight: '1.2' }}>
            Account Settings
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
            Manage your credentials, watchlist data, and account preferences
          </p>
        </div>

        {isTrial && (
          <section className="settings-card" style={{ marginBottom: '20px', background: 'rgba(255, 87, 1, 0.05)', borderColor: 'rgba(255, 87, 1, 0.2)' }}>
            <div className="settings-card-header">
              <div className="settings-card-header-icon primary">
                <Shield size={20} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Trial Account</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
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
                  <Shield size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Personal Details</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Your account identifiers</p>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Full Name</label>
                <input type="text" className="form-input" value={user?.username || ''} disabled style={{ opacity: 0.75 }} />
              </div>
              <div className="form-group">
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Email Address</label>
                <input type="email" className="form-input" value={user?.email || ''} disabled style={{ opacity: 0.75 }} />
              </div>
            </section>
          )}

          {!isTrial && (
            <section className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-header-icon primary">
                  <Key size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Change Password</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Update your account password</p>
                </div>
              </div>
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                <div className="form-group">
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                {passwordError && (
                  <p style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>{passwordError}</p>
                )}
                <button type="submit" className="btn-primary" disabled={isLoading} style={{ alignSelf: 'flex-start' }}>
                  {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Update Password'}
                </button>
              </form>
            </section>
          )}

          {!isTrial && (
            <section className="settings-card full-width">
              <div className="settings-card-header">
                <div className="settings-card-header-icon primary">
                  <FileDown size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '18px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Data Management</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Export your watchlist data as CSV</p>
                </div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <button className="btn-primary" onClick={handleExportDownload} disabled={exportLoading}>
                  {exportLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
                  Download Watchlist CSV
                </button>
              </div>
            </section>
          )}

          <section className="settings-card full-width danger-border">
            <div className="settings-card-header">
              <div className="settings-card-header-icon danger">
                <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '18px', fontWeight: '700', color: 'var(--danger)', margin: 0 }}>Account Deletion</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>Permanently delete your account and all data</p>
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <button className="btn-danger" onClick={() => setIsDeleteModalOpen(true)}>
                Delete Account
              </button>
            </div>
          </section>
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Account">
        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
          This will permanently delete your account, watchlist, and all associated data. This action cannot be undone.
        </p>
        {!isTrial && (
          <div className="form-group" style={{ marginTop: '8px' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Password</label>
            <input
              type="password"
              className="form-input"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              required
            />
          </div>
        )}
        {deleteError && <p style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>{deleteError}</p>}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </button>
          <button className="btn-danger" style={{ flex: 1 }} onClick={handleDeleteAccount} disabled={isLoading}>
            {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete Account'}
          </button>
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
