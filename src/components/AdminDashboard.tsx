import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { AdminStats } from './AdminStats';
import { AdminUsers } from './AdminUsers';
import { AdminAnalytics } from './AdminAnalytics';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';

type TabId = 'stats' | 'users' | 'analytics';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('stats');

  useEffect(() => {
    const storedSecret = api.getAdminSecret();
    if (storedSecret) {
      setSecret(storedSecret);
      setIsAuthModalOpen(false);
    }
  }, []);

  const handleAuth = async () => {
    if (!secret.trim()) {
      setError('Please enter the admin secret');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.getAdminStats();
      api.setAdminSecret(secret);
      setIsAuthModalOpen(false);
    } catch {
      setError('Invalid admin secret');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearAdminSecret();
    setIsAuthModalOpen(true);
    setSecret('');
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'stats', label: 'Stats' },
    { id: 'users', label: 'Users' },
    { id: 'analytics', label: 'Analytics' },
  ];

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
          <Button variant="secondary" onClick={handleLogout}>
            Exit Admin
          </Button>
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

      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => navigate('/app')}
        title="Admin Access"
        className="max-w-sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enter the admin secret to access the dashboard.
          </p>
          <Input
            label="Admin Secret"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter secret key"
            error={error}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => navigate('/app')} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAuth} disabled={isLoading} className="flex-1">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Access'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}