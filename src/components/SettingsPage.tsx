import { useState } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, Shield, Key, FileDown, AlertTriangle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import NavHeader from './NavHeader';
import { updatePassword, updateProfile, deleteAccount, getWatchlist } from '../lib/api';
import type { WatchlistItem } from '../types';

export default function SettingsPage() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const isTrial = user?.isTrial === true;

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [exportError, setExportError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [profileEdits, setProfileEdits] = useState<{ username?: string; email?: string }>({});
  const [profilePassword, setProfilePassword] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const profileUsername = profileEdits.username ?? user?.username ?? '';
  const profileEmail = profileEdits.email ?? user?.email ?? '';

  if (!token) {
    navigate('/auth', { replace: true });
    return null;
  }
  const t = token;

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    const errors: Record<string, string> = {};
    if (!passwordForm.currentPassword) errors.currentPassword = 'Password is required';
    if (!passwordForm.newPassword) errors.newPassword = 'Password is required';
    else if (passwordForm.newPassword.length < 8) errors.newPassword = 'Must be at least 8 characters';
    if (!passwordForm.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (passwordForm.newPassword !== passwordForm.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});
    setIsLoading(true);
    try {
      await updatePassword(t, passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProfileSave() {
    setProfileError('');
    setProfileSuccess('');
    const errors: Record<string, string> = {};
    const username = profileUsername.trim();
    const email = profileEmail.trim();
    if (!username || username.length < 4) errors.username = 'Must be at least 4 characters';
    else if (/\s/.test(username)) errors.username = 'Cannot contain spaces';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = 'Invalid email format';
    if (!profilePassword) errors.profilePassword = 'Current password is required';
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    setProfileLoading(true);
    try {
      const updated = await updateProfile(t, { username, email, currentPassword: profilePassword });
      updateUser(updated);
      setProfileSuccess('Profile updated successfully');
      setProfileEdits({});
      setProfilePassword('');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    if (!isTrial && !deletePassword) {
      setDeleteError('Password is required');
      return;
    }
    setIsLoading(true);
    try {
      await deleteAccount(t, isTrial ? undefined : deletePassword);
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
    setExportError('');
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
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <NavHeader />
      <div className="h-20" />
      <div className="container pb-12">
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
              {user?.googleId ? (
                <div className="mt-2">
                  <p className="text-sm text-muted">Signed in via Google. Email and username cannot be changed.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 mt-2">
                  <Input
                    label="Username"
                    type="text"
                    value={profileUsername}
                    onChange={e => { setProfileEdits({ ...profileEdits, username: e.target.value }); setProfileErrors(pe => ({ ...pe, username: '' })); }}
                    required
                    error={profileErrors.username}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={profileEmail}
                    onChange={e => { setProfileEdits({ ...profileEdits, email: e.target.value }); setProfileErrors(pe => ({ ...pe, email: '' })); }}
                    required
                    error={profileErrors.email}
                  />
                  <Input
                    label="Current Password"
                    type="password"
                    value={profilePassword}
                    onChange={e => { setProfilePassword(e.target.value); setProfileErrors(pe => ({ ...pe, profilePassword: '' })); }}
                    required
                    error={profileErrors.profilePassword}
                  />
                  {profileError && <p className="danger-text text-sm">{profileError}</p>}
                  {profileSuccess && <p className="text-sm" style={{ color: 'var(--success)' }}>{profileSuccess}</p>}
                  <button className="btn-primary self-start" onClick={handleProfileSave} disabled={profileLoading}>
                    {profileLoading ? <Loader2 size={16} className="animate-spin" /> : 'Update Details'}
                  </button>
                </div>
              )}
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
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 mt-2" noValidate>
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={e => { setPasswordForm({ ...passwordForm, currentPassword: e.target.value }); setPasswordErrors(pe => ({ ...pe, currentPassword: '' })); }}
                  required
                  error={passwordErrors.currentPassword}
                />
                <Input
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => { setPasswordForm({ ...passwordForm, newPassword: e.target.value }); setPasswordErrors(pe => ({ ...pe, newPassword: '' })); }}
                  required
                  error={passwordErrors.newPassword}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => { setPasswordForm({ ...passwordForm, confirmPassword: e.target.value }); setPasswordErrors(pe => ({ ...pe, confirmPassword: '' })); }}
                  required
                  error={passwordErrors.confirmPassword}
                />
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
            <section className="settings-card">
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
                {exportError && <p className="danger-text text-sm mt-2">{exportError}</p>}
              </div>
            </section>
          )}

          <section className="settings-card danger-border">
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
          <div className="mt-2">
            <Input
              label="Password"
              type="password"
              value={deletePassword}
              onChange={e => { setDeletePassword(e.target.value); setDeleteError(''); }}
              required
              error={deleteError}
            />
          </div>
        )}
        <div className="flex gap-3 mt-2">
          <button className="btn-secondary flex-1" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </button>
          <button className="btn-danger flex-1" onClick={handleDeleteAccount} disabled={isLoading}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Delete Account'}
          </button>
        </div>
      </Modal>
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
