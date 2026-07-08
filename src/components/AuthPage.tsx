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
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-mark">
            <div className="logo-tag"></div>
            <div className="logo-scan-line"></div>
          </div>
          <h2 className="login-title">Welcome to Sift</h2>
          <p className="login-subtitle">Real-time retail price optimization</p>
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
            <div className="error-banner">
              {error}
            </div>
          )}

          {activeTab === 'trial' && (
            <div className="promo-highlight">
              <div className="promo-title">
                ⚡ Instant 24-Hour Access
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.4', margin: 0 }}>
                Access Sift immediately. Test Watchlists, store syncing and real-time metrics. No password required.
              </p>
            </div>
          )}

          {activeTab !== 'trial' && (
            <div className="form-group">
              <div className="label-row">
                <label className="form-label">Username</label>
              </div>
              <div className="input-wrapper">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="form-group">
              <div className="label-row">
                <label className="form-label">Email Address</label>
              </div>
              <div className="input-wrapper">
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {activeTab !== 'trial' && (
            <div className="form-group">
              <div className="label-row">
                <label className="form-label">Password</label>
                {activeTab === 'signin' && <a href="#" className="forgot-link" onClick={e => e.preventDefault()}>Forgot?</a>}
              </div>
              <div className="input-wrapper">
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
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {activeTab === 'signin' && 'Sign In'}
            {activeTab === 'register' && 'Create Account'}
            {activeTab === 'trial' && 'Start'}
          </button>
        </form>

        <div className="login-footer">
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
