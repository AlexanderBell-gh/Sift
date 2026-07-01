import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Toast } from './ui/Toast';
import { useToast } from './ui/useToast';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
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
      if (isLogin) {
        await login(username, password);
        showToast('Signed in successfully', 'success');
      } else {
        await register(username, email, password);
        showToast('Account created', 'success');
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">Sift</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">Smart price comparison</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              variant={isLogin ? 'primary' : 'ghost'}
              onClick={() => setIsLogin(true)}
              className="flex-1"
            >
              <LogIn className="inline w-4 h-4 mr-1" /> Sign In
            </Button>
            <Button
              type="button"
              variant={!isLogin ? 'primary' : 'ghost'}
              onClick={() => setIsLogin(false)}
              className="flex-1"
            >
              <UserPlus className="inline w-4 h-4 mr-1" /> Register
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />

          {!isLogin && (
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          )}

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
          />

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
