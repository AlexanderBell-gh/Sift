import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '../contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const tabs: { key: AuthTab; label: string }[] = [
    { key: 'signin', label: 'Sign In' },
    { key: 'register', label: 'Register' },
    { key: 'trial', label: '24h Free Trial' },
  ];

  const submitLabel = activeTab === 'signin' && !forgotMode ? 'Sign In'
    : activeTab === 'signin' && forgotMode ? (resetToken ? 'Reset Password' : 'Get Reset Token')
    : activeTab === 'register' ? 'Create Account'
    : 'Start';

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetAuthForm() {
    setForgotMode(false);
    setResetToken(null);
    setForgotEmail('');
    setResetNewPassword('');
    setCopied(false);
    setFieldErrors({});
    setShowPassword(false);
    setShowResetPassword(false);
  }

  function handleTabChange(tab: AuthTab) {
    setActiveTab(tab);
    resetAuthForm();
  }

  function handleTabKeyDown(e: KeyboardEvent, index: number) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (index + dir + tabs.length) % tabs.length;
    handleTabChange(tabs[next].key);
    document.getElementById(`auth-tab-${tabs[next].key}`)?.focus();
  }

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle(response.credential);
      navigate('/search');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

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
  }, [activeTab, forgotMode, googleClientId, handleGoogleResponse]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (forgotMode) {
      if (!resetToken) {
        const errors: Record<string, string> = {};
        if (!forgotEmail.trim()) {
          errors.forgotEmail = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
          errors.forgotEmail = 'Enter a valid email address';
        }
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          return;
        }
      } else {
        if (!resetNewPassword) {
          setFieldErrors({ resetNewPassword: 'Password is required' });
          return;
        }
        if (resetNewPassword.length < 8) {
          setFieldErrors({ resetNewPassword: 'Password must be at least 8 characters' });
          return;
        }
      }
    } else if (activeTab === 'signin' || activeTab === 'register') {
      const errors: Record<string, string> = {};
      if (!username.trim()) errors.username = 'Username is required';
      if (!password) errors.password = 'Password is required';
      else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
      if (activeTab === 'register') {
        if (!email.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    setLoading(true);
    try {
      if (forgotMode) {
        if (!resetToken) {
          const res = await forgotPassword(forgotEmail);
          if (res.token) {
            setResetToken(res.token);
          } else {
            setError(res.message || 'No account found for that email');
          }
        } else {
          await resetPassword(resetToken, resetNewPassword);
          setForgotMode(false);
          setResetToken(null);
          setForgotEmail('');
          setResetNewPassword('');
        }
        return;
      }
      if (activeTab === 'signin') {
        await login(username, password);
      } else if (activeTab === 'register') {
        await register(username, email, password);
      } else {
        await startTrial();
      }
      navigate('/search');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
    setFieldErrors({});
    setShowResetPassword(false);
  }

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

        <div className="auth-tabs" role="tablist" aria-label="Authentication method">
          {tabs.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`auth-tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls="auth-panel"
              tabIndex={activeTab === tab.key ? 0 : -1}
              className={`auth-tab ${activeTab === tab.key ? 'active' : ''} ${tab.key === 'trial' ? 'tab-trial' : ''}`}
              onClick={() => handleTabChange(tab.key)}
              onKeyDown={(e) => handleTabKeyDown(e, i)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id="auth-panel"
          role="tabpanel"
          aria-labelledby={`auth-tab-${activeTab}`}
        >
          <form onSubmit={handleSubmit} className="auth-form" noValidate aria-busy={loading}>
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
                onChange={(e) => { setUsername(e.target.value); clearFieldError('username'); }}
                required
                error={fieldErrors.username}
              />
            )}

            {activeTab === 'register' && (
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                required
                error={fieldErrors.email}
              />
            )}

            {activeTab !== 'trial' && !forgotMode && (
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                required
                minLength={8}
                error={fieldErrors.password}
                suffix={
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
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
                    onChange={(e) => { setForgotEmail(e.target.value); clearFieldError('forgotEmail'); }}
                    required
                    error={fieldErrors.forgotEmail}
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
                      type={showResetPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={resetNewPassword}
                      onChange={(e) => { setResetNewPassword(e.target.value); clearFieldError('resetNewPassword'); }}
                      required
                      minLength={8}
                      error={fieldErrors.resetNewPassword}
                      suffix={
                        <button
                          type="button"
                          className="auth-password-toggle"
                          aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                          aria-pressed={showResetPassword}
                          onClick={() => setShowResetPassword((v) => !v)}
                        >
                          {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                  </>
                )}
              </>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitLabel}
            </button>
          </form>
        </div>

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
              <button type="button" className="auth-link" onClick={() => handleTabChange('register')}>
                Register
              </button>
            </span>
          )}
          {activeTab === 'register' && (
            <span>
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={() => handleTabChange('signin')}>
                Sign In
              </button>
            </span>
          )}
          {activeTab === 'trial' && <span>This is a temporary account with no login credentials</span>}
        </div>
      </div>
    </div>
  );
}