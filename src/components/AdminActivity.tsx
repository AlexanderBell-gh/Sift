import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, Shield, Clock, UserMinus } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { AuditLog } from '../types';

type ActionFilter = '' | 'admin.user_delete' | 'admin.role_change' | 'admin.trials_cleanup';

const ACTION_LABELS: Record<ActionFilter, string> = {
  '': 'All Actions',
  'admin.user_delete': 'User Deleted',
  'admin.role_change': 'Role Changed',
  'admin.trials_cleanup': 'Trials Cleaned',
};

export function AdminActivity() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs(
        page,
        limit,
        actionFilter || undefined,
        search || undefined,
        startDate || undefined,
        endDate || undefined
      );
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, actionFilter, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleActionChange = (action: ActionFilter) => {
    setActionFilter(action);
    setPage(1);
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'admin.user_delete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400">
            <UserMinus className="w-3 h-3" />
            Deleted
          </span>
        );
      case 'admin.role_change':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Shield className="w-3 h-3" />
            Role
          </span>
        );
      case 'admin.trials_cleanup':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            Cleanup
          </span>
        );
      default:
        return action;
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={actionFilter}
          onChange={(e) => handleActionChange(e.target.value as ActionFilter)}
          className="px-3 py-2 text-sm bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {(Object.keys(ACTION_LABELS) as ActionFilter[]).map((action) => (
            <option key={action} value={action}>
              {ACTION_LABELS[action]}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36"
          />
          <span className="text-zinc-400">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36"
          />
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by admin or target username..."
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
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No activity recorded yet
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-zinc-200 dark:border-white/10">
                <tr className="text-left text-sm text-zinc-500 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Admin</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 text-sm">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                    <td className="px-4 py-3 font-medium">{log.adminUsername}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300 text-sm">
                      {log.details}
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
    </div>
  );
}