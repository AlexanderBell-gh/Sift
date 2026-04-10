import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Trash2, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import type { AdminTrial } from '../types';

type StatusFilter = 'all' | 'active' | 'expired';

export function AdminTrials() {
  const [trials, setTrials] = useState<AdminTrial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedTrial, setSelectedTrial] = useState<AdminTrial | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [trialToDelete, setTrialToDelete] = useState<AdminTrial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [isCleanupLoading, setIsCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deletedCount: number } | null>(null);

  const loadTrials = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const data = await api.getAdminTrials(page, limit, status, search || undefined);
      setTrials(data.trials);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load trials');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    loadTrials();
  }, [loadTrials]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTrials();
  };

  const handleStatusFilter = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  const viewTrial = (trial: AdminTrial) => {
    setSelectedTrial(trial);
    setIsDetailModalOpen(true);
  };

  const confirmDelete = (trial: AdminTrial) => {
    setTrialToDelete(trial);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!trialToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteAdminUser(trialToDelete.id);
      setIsDeleteModalOpen(false);
      setTrialToDelete(null);
      loadTrials();
    } catch {
      alert('Failed to delete trial');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleanupLoading(true);
    setCleanupResult(null);
    try {
      const result = await api.cleanupExpiredTrials();
      setCleanupResult(result);
      loadTrials();
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

  const formatExpiry = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => handleStatusFilter('active')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => handleStatusFilter('expired')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === 'expired'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Expired
          </button>
        </div>
        <Button variant="secondary" onClick={() => setIsCleanupModalOpen(true)}>
          <Trash2 className="w-4 h-4" />
          Cleanup Expired
        </Button>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username..."
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
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {trials.map((trial) => (
                  <tr key={trial.id} className="hover:bg-zinc-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium">{trial.username}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatDate(trial.createdAt)}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{formatExpiry(trial.trialExpiresAt)}</td>
                    <td className="px-4 py-3">
                      {trial.isExpired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{trial.productCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" onClick={() => viewTrial(trial)}>
                          <User className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" onClick={() => confirmDelete(trial)}>
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
        title="Trial Details"
        className="max-w-md"
      >
        {selectedTrial && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Username</p>
                <p className="font-medium">{selectedTrial.username}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Email</p>
                <p className="font-medium">{selectedTrial.email}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Created</p>
                <p className="font-medium">{formatDate(selectedTrial.createdAt)}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Expires</p>
                <p className="font-medium">{formatExpiry(selectedTrial.trialExpiresAt)}</p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Status</p>
                <p className="font-medium">
                  {selectedTrial.isExpired ? (
                    <span className="text-red-500">Expired</span>
                  ) : (
                    <span className="text-emerald-500">Active</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 dark:text-zinc-400">Products</p>
                <p className="font-medium">{selectedTrial.productCount}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Trial"
        className="max-w-sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Are you sure you want to delete trial user <strong>{trialToDelete?.username}</strong>? This will permanently delete all their data.
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