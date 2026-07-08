import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

type AuthTab = 'signin' | 'register' | 'trial';

export default function AuthPage() {
  const { login, register, startTrial } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (activeTab === 'signin') {
        await login(username, password);
        showToast('Signed in successfully', 'success');
      } else if (activeTab === 'register') {
        await register(username, email, password);
        showToast('Account created', 'success');
      } else {
        await startTrial();
        showToast('Trial started — 24h access', 'success');
      }
      navigate('/search');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-mark" style={{ margin: '0 auto' }}>
            <div className="logo-tag"></div>
            <div className="logo-scan-line"></div>
          </div>
          <h2>Welcome to Sift</h2>
          <p>Real-time retail price optimization</p>
        </div>

        <div className="auth-tabs">
          <div
            className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            Sign In
          </div>
          <div
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </div>
          <div
            className={`auth-tab ${activeTab === 'trial' ? 'active' : ''}`}
            onClick={() => setActiveTab('trial')}
            style={{ color: activeTab === 'trial' ? 'var(--primary)' : undefined }}
          >
            24h Free Trial
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form-container">
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'trial' && (
            <div className="promo-highlight">
              <div className="promo-title">
                Instant Sandbox
                <span className="promo-badge">24h Pass</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.4', margin: 0 }}>
                Access Sift Premium immediately. Test Watchlists, store syncing and real-time metrics. No password required.
              </p>
            </div>
          )}

          {activeTab !== 'trial' && (
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          {activeTab === 'register' && (
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {activeTab !== 'trial' && (
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            style={activeTab === 'trial' ? { background: 'var(--text)', color: 'var(--surface)' } : undefined}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {activeTab === 'signin' && 'Sign In'}
            {activeTab === 'register' && 'Create Account'}
            {activeTab === 'trial' && 'Launch 24h Session'}
          </button>
        </form>

        <div className="auth-footer">
          {activeTab === 'signin' && (
            <>Don't have an account? <span className="auth-link" onClick={() => setActiveTab('register')}>Register</span></>
          )}
          {activeTab === 'register' && (
            <>Already have an account? <span className="auth-link" onClick={() => setActiveTab('signin')}>Sign In</span></>
          )}
          {activeTab === 'trial' && (
            <>Instant sandboxing without passwords or credentials.</>
          )}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
