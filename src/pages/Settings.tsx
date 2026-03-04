import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: '',
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('Password changed successfully');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    
    if (!emailForm.newEmail || !emailForm.password) {
      setEmailError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    try {
      const updatedUser = await api.changeEmail(emailForm.newEmail, emailForm.password);
      setEmailForm({ newEmail: '', password: '' });
      alert(`Email changed successfully to ${updatedUser.email}`);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to change email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    
    if (!deletePassword) {
      setDeleteError('Please enter your password');
      return;
    }
    
    setIsLoading(true);
    try {
      await api.deleteAccount(deletePassword);
      signOut();
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Account</h2>
            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <p><span className="font-medium text-zinc-900 dark:text-zinc-100">Username:</span> {user?.username}</p>
              <p><span className="font-medium text-zinc-900 dark:text-zinc-100">Email:</span> {user?.email}</p>
              <p><span className="font-medium text-zinc-900 dark:text-zinc-100">Account type:</span> {user?.isTrial ? 'Trial' : 'Registered'}</p>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
              {passwordError && (
                <p className="text-red-500 text-sm">{passwordError}</p>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
              </Button>
            </form>
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Change Email</h2>
            <form onSubmit={handleEmailChange} className="space-y-4">
              <Input
                label="New Email"
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                required
              />
              <Input
                label="Password (for verification)"
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                required
              />
              {emailError && (
                <p className="text-red-500 text-sm">{emailError}</p>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Email'}
              </Button>
            </form>
          </section>

          <section className="bg-white dark:bg-zinc-900 rounded-lg border border-red-200 dark:border-red-900 p-6">
            <h2 className="text-lg font-semibold mb-4 text-red-600">Delete Account</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Once you delete your account, there is no going back. All your products, categories, and data will be permanently deleted.
            </p>
            <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
              Delete Account
            </Button>
          </section>
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account"
        className="max-w-sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to delete your account? This action cannot be undone.
          </p>
          <Input
            label="Enter your password to confirm"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            required
          />
          {deleteError && (
            <p className="text-red-500 text-sm">{deleteError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccount} disabled={isLoading} className="flex-1">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
