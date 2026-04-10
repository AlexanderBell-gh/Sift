import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Loader2, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { AdminStats } from './AdminStats';
import { AdminUsers } from './AdminUsers';
import { AdminAnalytics } from './AdminAnalytics';

type TabId = 'stats' | 'users' | 'analytics';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('stats');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const user = api.getStoredUser();
      if (user && user.role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'stats', label: 'Stats' },
    { id: 'users', label: 'Users' },
    { id: 'analytics', label: 'Analytics' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight mb-2">Access Denied</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            You don't have permission to access the admin dashboard.
          </p>
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] text-zinc-800 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/app')}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-500" />
            </button>
            <Shield className="w-5 h-5 text-emerald-500" />
            <h1 className="text-xl font-semibold tracking-tight">Admin Dashboard</h1>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Exit Admin
          </button>
        </div>

        <div className="border-b border-zinc-200 dark:border-white/10 mb-6">
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'stats' && <AdminStats />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'analytics' && <AdminAnalytics />}
      </div>
    </div>
  );
}