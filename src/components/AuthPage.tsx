import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';
import { Input } from './ui/Input';
import { forgotPassword, resetPassword } from '../lib/api';

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
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [copied, setCopied] = useState(false);

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
    if (activeTab !== 'signin' || forgotMode || !googleBtnRef.current || !googleClientId) return;

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
  }, [activeTab, forgotMode, googleClientId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (forgotMode) {
        if (!resetToken) {
          const res = await forgotPassword(forgotEmail);
          if (res.token) {
            setResetToken(res.token);
            showToast('Reset token generated — valid for 30 minutes', 'success');
          } else {
            setError(res.message || 'No account found for that email');
          }
        } else {
          await resetPassword(resetToken, resetNewPassword);
          showToast('Password reset — sign in with your new password', 'success');
          setForgotMode(false);
          setResetToken(null);
          setForgotEmail('');
          setResetNewPassword('');
        }
        return;
      }
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

  async function handleCopyToken() {
    if (!resetToken) return;
    try {
      await navigator.clipboard.writeText(resetToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  function handleBackToSignIn() {
    setForgotMode(false);
    setResetToken(null);
    setForgotEmail('');
    setResetNewPassword('');
    setCopied(false);
    setError('');
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
              onClick={() => {
                setActiveTab(tab.key);
                setForgotMode(false);
                setResetToken(null);
                setForgotEmail('');
                setResetNewPassword('');
                setCopied(false);
              }}
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
              <div className="auth-promo-title">⚡ 24-Hour Trial Access</div>
              <p className="auth-promo-desc">
                Try Sift for 24 hours. No account or password required.
              </p>
            </div>
          )}

          {activeTab !== 'trial' && !forgotMode && (
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

          {activeTab !== 'trial' && !forgotMode && (
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
          {activeTab === 'signin' && !forgotMode && (
            <button type="button" className="auth-forgot" onClick={() => setForgotMode(true)}>
              Forgot password?
            </button>
          )}

          {activeTab === 'signin' && forgotMode && (
            <>
              <div className="auth-promo">
                <div className="auth-promo-title">Recover your password</div>
                {!resetToken ? (
                  <p className="auth-promo-desc">
                    Enter your account email to get a one-time reset token. No email is sent — the token appears right here.
                  </p>
                ) : (
                  <p className="auth-promo-desc">
                    Use this token once within 30 minutes to set a new password.
                  </p>
                )}
              </div>

              {!resetToken ? (
                <Input
                  label="Account Email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              ) : (
                <>
                  <div className="auth-token-box">
                    <div className="auth-token-label">Reset token</div>
                    <div className="auth-token-value">
                      <code className="auth-token-code">{resetToken}</code>
                      <button type="button" className="auth-token-copy" onClick={handleCopyToken}>
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </>
              )}
            </>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {activeTab === 'signin' && !forgotMode && 'Sign In'}
            {activeTab === 'signin' && forgotMode && (resetToken ? 'Reset Password' : 'Get Reset Token')}
            {activeTab === 'register' && 'Create Account'}
            {activeTab === 'trial' && 'Start'}
          </button>
        </form>

        {activeTab === 'signin' && !forgotMode && (
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or continue with</span>
            <span className="auth-divider-line" />
          </div>
        )}

        {activeTab === 'signin' && !forgotMode && (
          googleClientId ? (
            <div ref={googleBtnRef} className="google-btn-wrapper" />
          ) : (
            <div className="auth-error" role="alert">
              Google Sign-In is not configured (VITE_GOOGLE_CLIENT_ID missing)
            </div>
          )
        )}

        <div className="auth-footer">
          {activeTab === 'signin' && forgotMode && (
            <span>
              Remembered it?{' '}
              <button type="button" className="auth-link" onClick={handleBackToSignIn}>
                Back to Sign In
              </button>
            </span>
          )}
          {activeTab === 'signin' && !forgotMode && (
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
          {activeTab === 'trial' && <span>This is a temporary account with no login credentials</span>}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
