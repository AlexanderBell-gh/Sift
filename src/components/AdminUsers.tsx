import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Trash2, ChevronLeft, ChevronRight, User, Shield, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import type { AdminUser, AdminUserDetail } from '../types';

type FilterType = 'users' | 'trials' | 'all';

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('users');
  const [expiredCount, setExpiredCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [userToChangeRole, setUserToChangeRole] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [isChangingRole, setIsChangingRole] = useState(false);

  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isCleanupLoading, setIsCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deletedCount: number } | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminUsers(page, limit, search || undefined, filter);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, filter]);

  const loadExpiredCount = useCallback(async () => {
    try {
      const data = await api.getAdminTrials(1, 1, 'expired');
      setExpiredCount(data.total);
    } catch {
      setExpiredCount(0);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadExpiredCount();
  }, [loadUsers, loadExpiredCount]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
  };

  const viewUser = async (userId: string) => {
    try {
      const user = await api.getAdminUser(userId);
      setSelectedUser(user);
      setIsDetailModalOpen(true);
    } catch {
      alert('Failed to load user details');
    }
  };

  const confirmDelete = (user: AdminUser) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteAdminUser(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch {
      alert('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const openRoleModal = (user: AdminUser, role: 'admin' | 'user') => {
    setUserToChangeRole(user);
    setNewRole(role);
    setIsRoleModalOpen(true);
  };

  const handleRoleChange = async () => {
    if (!userToChangeRole) return;
    setIsChangingRole(true);
    try {
      await api.updateUserRole(userToChangeRole.id, newRole);
      setIsRoleModalOpen(false);
      setUserToChangeRole(null);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleanupLoading(true);
    setCleanupResult(null);
    try {
      const result = await api.cleanupExpiredTrials();
      setCleanupResult(result);
      loadExpiredCount();
      loadUsers();
    } catch {
      alert('Failed to cleanup trials');
    } finally {
      setIsCleanupLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange('users')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'users'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => handleFilterChange('trials')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'trials'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Trials
          </button>
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            All
          </button>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsCleanupModalOpen(true)}
          disabled={expiredCount === 0}
        >
          <Trash2 className="w-4 h-4" />
          Cleanup ({expiredCount} expired)
        </Button>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full"
            />
          </div>
          <Button type="submit" variant="secondary">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : (
        <>
          <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-200 dark:border-white/10">
                <tr className="text-left text-sm text-zinc-500 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">{user.username}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.isTrial ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Trial
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Registered
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{user.productCount}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" onClick={() => viewUser(user.id)}>
                          <User className="w-4 h-4" />
                        </Button>
                        {user.role === 'admin' ? (
                          <Button variant="ghost" onClick={() => openRoleModal(user, 'user')}>
                            <Shield className="w-4 h-4 text-zinc-400" />
                          </Button>
                        ) : (
                          <Button variant="ghost" onClick={() => openRoleModal(user, 'admin')}>
                            <Shield className="w-4 h-4 text-purple-500" />
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => confirmDelete(user)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              <p>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button
                  variant="ghost"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="User Details"
        className="max-w-2xl"
      >
        {selectedUser && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Username</p>
                <p className="font-medium">{selectedUser.username}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Email</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Role</p>
                <p className="font-medium">{selectedUser.role === 'admin' ? 'Admin' : 'User'}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Account Type</p>
                <p className="font-medium">{selectedUser.isTrial ? 'Trial' : 'Registered'}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Joined</p>
                <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Products</p>
                <p className="font-medium">{selectedUser.productCount}</p>
              </div>
            </div>

            {selectedUser.products.length > 0 && (
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Products ({selectedUser.products.length})</p>
                <div className="max-h-64 overflow-y-auto border border-zinc-200 dark:border-white/10 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">Category</th>
                        <th className="px-3 py-2 text-left font-medium">Store</th>
                        <th className="px-3 py-2 text-right font-medium">Prices</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                      {selectedUser.products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-3 py-2">{product.name}</td>
                          <td className="px-3 py-2">{product.category}</td>
                          <td className="px-3 py-2">{product.store || '-'}</td>
                          <td className="px-3 py-2 text-right">{product.priceCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
        className="max-w-sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Are you sure you want to delete user <strong>{userToDelete?.username}</strong>? This will permanently delete all their products and data.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting} className="flex-1">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Change Role"
        className="max-w-sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Are you sure you want to change <strong>{userToChangeRole?.username}</strong>'s role to <strong>{newRole === 'admin' ? 'Admin' : 'User'}</strong>?
          </p>
          {newRole === 'user' && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Warning: Demoting an admin to user will remove their access to the admin dashboard.
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsRoleModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={isChangingRole} className="flex-1">
              {isChangingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCleanupModalOpen}
        onClose={() => {
          setIsCleanupModalOpen(false);
          setCleanupResult(null);
        }}
        title="Cleanup Expired Trials"
        className="max-w-sm"
      >
        <div className="p-6 space-y-4">
          {cleanupResult ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
                <Clock className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="font-medium">Cleaned up {cleanupResult.deletedCount} expired trial(s)</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                This will permanently delete all expired trial accounts and their data. This action cannot be undone.
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setIsCleanupModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="danger" onClick={handleCleanup} disabled={isCleanupLoading} className="flex-1">
                  {isCleanupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cleanup'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}