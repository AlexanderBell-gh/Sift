import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, Eye, Bell, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

type Tab = 'signin' | 'signup';

export function Landing() {
  const navigate = useNavigate();
  const { signIn, signUp, createTrial } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [signInData, setSignInData] = useState({ username: '', password: '' });
  const [signUpData, setSignUpData] = useState({ email: '', username: '', password: '' });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await signIn(signInData);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await signUp(signUpData);
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrial = async () => {
    setIsLoading(true);
    setError('');
    try {
      await createTrial();
      navigate('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start trial');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800">
      <div className="min-h-screen flex">
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <img
                src="/light_mode_logo.png"
                alt="PriceTrackr"
                className="h-10 rounded-lg object-contain dark:hidden"
              />
              <img
                src="/dark_mode_logo.png"
                alt="PriceTrackr"
                className="h-10 rounded-lg object-contain hidden dark:block"
              />
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
              <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                    activeTab === 'signin'
                      ? 'text-sky-600 border-b-2 border-sky-600'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 pb-3 text-sm font-medium transition-colors ${
                    activeTab === 'signup'
                      ? 'text-sky-600 border-b-2 border-sky-600'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {activeTab === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Input
                    label="Username"
                    type="text"
                    value={signInData.username}
                    onChange={(e) => setSignInData({ ...signInData, username: e.target.value })}
                    placeholder="Enter your username"
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                  <Input
                    label="Username"
                    type="text"
                    value={signUpData.username}
                    onChange={(e) => setSignUpData({ ...signUpData, username: e.target.value })}
                    placeholder="Choose a username"
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    placeholder="At least 6 characters"
                    required
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                  </Button>
                </form>
              )}

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleTrial}
                  variant="secondary"
                  className="w-full mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="flex items-center justify-center">
                      Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-1 bg-zinc-900 dark:bg-zinc-950 items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Track prices. Save money.
            </h2>
            <p className="text-zinc-400 text-lg mb-10">
              Monitor product prices across your favorite stores and get notified when prices drop.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Track Prices</h3>
                  <p className="text-zinc-400 text-sm">Add products and monitor their prices over time</p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Visualize Trends</h3>
                  <p className="text-zinc-400 text-sm">See price history with beautiful charts</p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Get Alerts</h3>
                  <p className="text-zinc-400 text-sm">Know instantly when prices drop</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
