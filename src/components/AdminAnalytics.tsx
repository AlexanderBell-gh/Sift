import { useState, useEffect } from 'react';
import { Loader2, Package, Tag, Users } from 'lucide-react';
import { api } from '../lib/api';
import { DEFAULT_CATEGORIES } from '../types';

const STORE_ICONS: Record<string, string> = {
  "Sainsbury's": '/storeicon_sainsburys.png',
  'Tesco': '/storeicon_tesco.png',
  'Morrisons': '/storeicon_morrisons.png',
  'ASDA': '/storeicon_asda.png',
  "M&S": '/storeicon_mands.png',
  'Waitrose': '/storeicon_waitrose.png',
  'Ocado': '/storeicon_ocado.png',
  'Aldi': '/storeicon_aldi.png',
  'Lidl': '/storeicon_lidl.png',
  'Iceland': '/storeicon_iceland.png',
  'Co-op': '/storeicon_co-op.png',
};

const STORE_NAMES = ["Sainsbury's", 'Tesco', 'Morrisons', 'ASDA', "M&S", 'Waitrose', 'Ocado', 'Aldi', 'Lidl', 'Iceland', 'Co-op'];

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<{
    categoryDistribution: Record<string, number>;
    storeDistribution: Record<string, number>;
    totalProducts: number;
    totalPriceEntries: number;
    userCount: number;
    regularUsers: number;
    trialUsers: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

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
                  src={STORE_ICONS[store.name]}
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