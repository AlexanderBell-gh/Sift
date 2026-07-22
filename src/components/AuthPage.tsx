import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';
import { Input } from './ui/Input';

type AuthTab = 'signin' | 'register' | 'trial';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (credential: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function AuthPage() {
  const { login, register, loginWithGoogle, startTrial } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async function handleGoogleResponse(response: { credential: string }) {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle(response.credential);
      showToast('Signed in with Google', 'success');
      navigate('/search');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      showToast(err instanceof Error ? err.message : 'Google sign-in failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== 'signin' || !googleBtnRef.current || !googleClientId) return;

    const interval = setInterval(() => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        clearInterval(interval);
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: googleBtnRef.current.offsetWidth.toString(),
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeTab, googleClientId]);

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
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  }

  const tabs: { key: AuthTab; label: string }[] = [
    { key: 'signin', label: 'Sign In' },
    { key: 'register', label: 'Register' },
    { key: 'trial', label: '24h Free Trial' },
  ];

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-mark">
            <div className="logo-tag" />
            <div className="logo-scan-line" />
          </div>
          <h2 className="auth-title">Welcome to Sift</h2>
          <p className="auth-subtitle">Find and keep track of those offers</p>
        </div>

        <div className="auth-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`auth-tab ${activeTab === tab.key ? 'active' : ''} ${tab.key === 'trial' ? 'tab-trial' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {activeTab === 'trial' && (
            <div className="auth-promo">
              <div className="auth-promo-title">⚡ Instant 24-Hour Access</div>
              <p className="auth-promo-desc">
                Test Watchlists, store syncing and real-time metrics. No password required.
              </p>
            </div>
          )}

          {activeTab !== 'trial' && (
            <Input
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          {activeTab === 'register' && (
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}

          {activeTab !== 'trial' && (
            <div className="auth-field-row">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          )}
          {activeTab === 'signin' && (
            <a href="#" className="auth-forgot" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {activeTab === 'signin' && 'Sign In'}
            {activeTab === 'register' && 'Create Account'}
            {activeTab === 'trial' && 'Start'}
          </button>
        </form>

        {activeTab === 'signin' && (
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or continue with</span>
            <span className="auth-divider-line" />
          </div>
        )}

        {activeTab === 'signin' && (
          googleClientId ? (
            <div ref={googleBtnRef} className="google-btn-wrapper" />
          ) : (
            <div className="auth-error" role="alert">
              Google Sign-In is not configured (VITE_GOOGLE_CLIENT_ID missing)
            </div>
          )
        )}

        <div className="auth-footer">
          {activeTab === 'signin' && (
            <span>
              Don't have an account?{' '}
              <button type="button" className="auth-link" onClick={() => setActiveTab('register')}>
                Register
              </button>
            </span>
          )}
          {activeTab === 'register' && (
            <span>
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={() => setActiveTab('signin')}>
                Sign In
              </button>
            </span>
          )}
          {activeTab === 'trial' && <span>Sandboxing without passwords or credentials.</span>}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
