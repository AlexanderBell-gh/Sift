import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, History, Search, ArrowRight, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] relative overflow-hidden">
      {/* Subtle gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="min-h-screen flex relative z-10">
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:max-w-md">
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)] border border-zinc-200/80 dark:border-white/10 p-6 sm:p-8">
              <div className="flex items-center justify-center mb-6">
                <img
                  src="/landing_logo.png"
                  alt="PriceTrackr"
                  className="h-13 w-auto object-contain"
                />
              </div>
              <div className="flex border-b border-zinc-200/80 dark:border-white/10 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 pb-3 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'signin'
                      ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 pb-3 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'signup'
                      ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-200/50 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
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
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
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
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </form>
              )}

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200/80 dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white/80 dark:bg-zinc-900/80 px-3 text-zinc-400">or</span>
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="flex items-center justify-center">
                      Start Free Trial <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-zinc-400">
            <a href="https://github.com/Alex-Projects-Master/PriceTrackr" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
              View project on GitHub
            </a>
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-1 bg-zinc-950 items-center justify-center p-12 relative overflow-hidden">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          
          <div className="max-w-lg text-center relative z-10">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
              Track prices.<br />
              <span className="gradient-text">Save money.</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-12">
              Monitor product prices across your favorite stores and get notified when prices drop.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-4 text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Track Products</h3>
                  <p className="text-zinc-500 text-sm mt-0.5">Add products with images, categories, and store information</p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <History className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Price History</h3>
                  <p className="text-zinc-500 text-sm mt-0.5">Record and view price changes over time with visual trends</p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Search className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Search & Filter</h3>
                  <p className="text-zinc-500 text-sm mt-0.5">Find products quickly by name, store, or category</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
