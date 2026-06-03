import { useState, useEffect } from 'react';
import { Loader2, Package, Tag, Users } from 'lucide-react';
import { api } from '../lib/api';
import { DEFAULT_CATEGORIES, STORE_FAVICONS, STORES } from '../types';

const STORE_NAMES = STORES;

type TimeRange = '7d' | '30d' | '90d' | 'all';

function TimeSeriesChart({ data, color, label }: { data: { date: string; count: number }[]; color: string; label: string }) {
  if (data.length === 0) {
    return <div className="h-32 flex items-center justify-center text-zinc-400 text-sm">No data</div>;
  }

  const maxVal = Math.max(...data.map(d => d.count), 1);
  const width = 100;
  const height = 40;
  const padding = 4;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
    y: height - padding - (d.count / maxVal) * (height - padding * 2),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="space-y-2">
      <div className="h-32 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#gradient-${label})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{data[0]?.date ? (() => { const [, m, d] = data[0].date.split('-'); return `${d}/${m}`; })() : '-'}</span>
        <span>{data[data.length - 1]?.date ? (() => { const [, m, d] = data[data.length - 1].date.split('-'); return `${d}/${m}`; })() : '-'}</span>
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<{
    categoryDistribution: Record<string, number>;
    storeDistribution: Record<string, number>;
    totalProducts: number;
    totalPriceEntries: number;
    userCount: number;
    regularUsers: number;
    trialUsers: number;
    userRegistrations: { date: string; count: number }[];
    productCreations: { date: string; count: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const loadAnalytics = async () => {
    try {
      const data = await api.getAdminAnalytics();
      setAnalytics(data);
    } catch {
      setError('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      loadAnalytics();
    }, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  const categoryData = DEFAULT_CATEGORIES.map(cat => ({
    name: cat.name,
    icon: cat.icon,
    count: analytics?.categoryDistribution[cat.id] || 0,
  })).sort((a, b) => b.count - a.count);

  const maxCategoryCount = Math.max(...categoryData.map(c => c.count), 1);

  const storeData = STORE_NAMES.map(name => ({
    name,
    count: analytics?.storeDistribution[name] || 0,
  })).sort((a, b) => b.count - a.count);

  const maxStoreCount = Math.max(...storeData.map(s => s.count), 1);

  const filterByRange = (data: { date: string; count: number }[]): { date: string; count: number }[] => {
    if (timeRange === 'all') return data;
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return data.filter(d => d.date >= cutoff);
  };

  const filteredUsers = filterByRange(analytics?.userRegistrations || []);
  const filteredProducts = filterByRange(analytics?.productCreations || []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Users</p>
              <p className="text-xl font-semibold tracking-tight">{analytics?.userCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Regular</p>
              <p className="text-xl font-semibold tracking-tight">{analytics?.regularUsers ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Trial</p>
              <p className="text-xl font-semibold tracking-tight">{analytics?.trialUsers ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Package className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Products</p>
              <p className="text-xl font-semibold tracking-tight">{analytics?.totalProducts ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <Tag className="w-4 h-4 text-pink-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Prices</p>
              <p className="text-xl font-semibold tracking-tight">{analytics?.totalPriceEntries ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold tracking-tight">Metrics Over Time</h3>
          <div className="flex gap-1">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">New Users</h4>
            <TimeSeriesChart data={filteredUsers} color="#3b82f6" label="users" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">New Products</h4>
            <TimeSeriesChart data={filteredProducts} color="#10b981" label="products" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold tracking-tight mb-4">Category Distribution</h3>
          <div className="space-y-3">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400 w-20">{cat.name}</span>
                <div className="flex-1 h-2 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-white/10 p-6">
          <h3 className="text-sm font-semibold tracking-tight mb-4">Store Distribution</h3>
          <div className="space-y-3">
            {storeData.map((store) => (
              <div key={store.name} className="flex items-center gap-3">
                <img
                  src={STORE_FAVICONS[store.name]}
                  alt={store.name}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-sm text-zinc-500 dark:text-zinc-400 w-20">{store.name}</span>
                <div className="flex-1 h-2 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(store.count / maxStoreCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{store.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}