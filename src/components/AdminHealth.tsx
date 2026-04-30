import { useState, useEffect } from 'react';
import { Activity, Database, AlertTriangle, CheckCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';

export function AdminHealth() {
  const [health, setHealth] = useState<{
    status: 'healthy' | 'degraded';
    requests: { today: number; yesterday: number; total: number };
    avgLatencyMs: number;
    errorCount: number;
    lastError: string | null;
    recentErrors: { timestamp: string; message: string }[];
    storage: { keys: number; estimatedBytes: number; estimatedMB: string };
    version: string;
    userCount: number;
    productCount: number;
    workerRegion: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorsExpanded, setErrorsExpanded] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    try {
      const data = await api.getAdminHealth();
      setHealth(data);
    } catch {
      setError('Failed to load health data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  const latencyColor = health!.avgLatencyMs < 200 ? 'text-emerald-500' : health!.avgLatencyMs < 500 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">System Health</h2>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          health!.status === 'healthy' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
        }`}>
          {health!.status === 'healthy' ? (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
          <span className={`text-sm font-medium ${health!.status === 'healthy' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {health!.status === 'healthy' ? 'Healthy' : 'Degraded'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Requests Today</p>
              <p className="text-xl font-semibold tracking-tight">{health!.requests.today.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Zap className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg Latency</p>
              <p className={`text-xl font-semibold tracking-tight ${latencyColor}`}>{health!.avgLatencyMs}ms</p>
            </div>
          </div>
        </div>
        <div
          onClick={() => health!.errorCount > 0 && setErrorsExpanded(!errorsExpanded)}
          className={`bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4 ${health!.errorCount > 0 ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors' : ''}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Errors</p>
                <p className="text-xl font-semibold tracking-tight">{health!.errorCount}</p>
              </div>
            </div>
            {health!.errorCount > 0 && (
              errorsExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Database className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Storage</p>
              <p className="text-xl font-semibold tracking-tight">{health!.storage.estimatedMB}MB</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold tracking-tight mb-4">Request Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Today</span>
              <span className="text-sm font-medium">{health!.requests.today.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Yesterday</span>
              <span className="text-sm font-medium">{health!.requests.yesterday.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">All Time</span>
              <span className="text-sm font-medium">{health!.requests.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold tracking-tight mb-4">System Info</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Version</span>
              <span className="text-sm font-medium">{health!.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Region</span>
              <span className="text-sm font-medium">{health!.workerRegion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Total Users</span>
              <span className="text-sm font-medium">{health!.userCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Total Products</span>
              <span className="text-sm font-medium">{health!.productCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">KV Keys</span>
              <span className="text-sm font-medium">{health!.storage.keys}</span>
            </div>
          </div>
        </div>
      </div>

      {errorsExpanded && health!.recentErrors && health!.recentErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Recent Errors</span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {health!.recentErrors.map((err, idx) => (
              <div key={idx} className="text-sm border-b border-red-500/20 pb-2 last:border-0">
                <p className="text-zinc-600 dark:text-zinc-400">
                  {new Date(err.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-zinc-700 dark:text-zinc-300 font-mono text-xs mt-1 break-all">{err.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}