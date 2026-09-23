import type { ReactNode } from 'react';
import { useAuth } from '../contexts/auth-context';
import { ForbiddenPage } from './ErrorPage';

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="empty-state-box" aria-live="polite">
            <p className="empty-state-title">Checking access</p>
            <p className="empty-state-desc">Verifying your session.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token || user?.role !== 'admin') {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
