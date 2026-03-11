import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../lib/api';

export function MagicVerify() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError('Invalid or missing token');
      return;
    }

    api.verifyMagicLink(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/app'), 1500);
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to verify magic link');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-500">Verifying magic link...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-zinc-800 dark:text-zinc-100 font-medium">Successfully signed in!</p>
            <p className="text-zinc-500 text-sm mt-2">Redirecting to app...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 font-medium">Verification failed</p>
            <p className="text-zinc-500 text-sm mt-2">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-sky-600 hover:underline text-sm"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
