import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
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
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A]">
      <NavHeader title="Settings" showBack />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-4">
          <section className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-sm font-semibold tracking-tight mb-4 text-zinc-900 dark:text-white">Account</h2>
            <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              <p><span className="font-medium text-zinc-700 dark:text-zinc-200">Username:</span> {user?.username}</p>
              <p><span className="font-medium text-zinc-700 dark:text-zinc-200">Email:</span> {user?.email}</p>
              <p><span className="font-medium text-zinc-700 dark:text-zinc-200">Account type:</span> {isTrial ? 'Trial' : 'Registered'}</p>
            </div>
          </section>

          {!isTrial && (
            <section className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
              <h2 className="text-sm font-semibold tracking-tight mb-4 text-zinc-900 dark:text-white">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
                {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
                </Button>
              </form>
            </section>
          )}

          {!isTrial && (
            <section className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
              <h2 className="text-sm font-semibold tracking-tight mb-4 text-zinc-900 dark:text-white">Data Management</h2>
              <Button variant="secondary" onClick={handleExportDownload} disabled={exportLoading} className="flex items-center justify-center gap-1.5">
                {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download Watchlist CSV
              </Button>
            </section>
          )}

          {!isTrial && (
            <section className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
              <h2 className="text-sm font-semibold tracking-tight mb-4 text-zinc-900 dark:text-white">About</h2>
              <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                <p><span className="font-medium text-zinc-700 dark:text-zinc-200">Version:</span> 1.0.0</p>
              </div>
            </section>
          )}

          <section className="bg-white dark:bg-white/5 border border-red-200/50 dark:border-red-500/20 rounded-xl p-6">
            <h2 className="text-sm font-semibold tracking-tight mb-2 text-red-500">Delete Account</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Once you delete your account, there is no going back. All your watchlist, price history, and data will be permanently deleted.
            </p>
            <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
              Delete Account
            </Button>
          </section>
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Account" className="max-w-sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Are you sure you want to delete your account? This action cannot be undone.
          </p>
          {!isTrial && (
            <Input
              label="Enter your password to confirm"
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              required
            />
          )}
          {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount} disabled={isLoading} className="flex-1">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
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
