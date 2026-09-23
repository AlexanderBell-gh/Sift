import { Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, SearchX, TriangleAlert } from 'lucide-react';

interface ErrorPageProps {
  code: string;
  title: string;
  message: string;
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
}

function ErrorPage({
  code,
  title,
  message,
  primaryLabel = 'Back to home',
  primaryTo = '/',
  secondaryLabel,
  secondaryTo,
}: ErrorPageProps) {
  const navigate = useNavigate();
  const Icon = code === '403' ? ShieldAlert : code === '404' ? SearchX : TriangleAlert;

  return (
    <div className="auth-wrapper">
      <div className="auth-card" role="alert" aria-live="assertive">
        <div className="auth-header">
          <Icon className="icon-md" aria-hidden="true" />
          <span className="metric-label">{`Error ${code}`}</span>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{message}</p>
        </div>
        <div className="admin-stack-sm">
          <button onClick={() => navigate(primaryTo)} className="btn-primary">
            {primaryLabel}
          </button>
          {secondaryLabel && secondaryTo && (
            <button onClick={() => navigate(secondaryTo)} className="btn-secondary">
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="Access denied"
      message="This area is restricted to administrators. Sign in with an admin account to continue."
      secondaryLabel="Sign in"
      secondaryTo="/auth"
    />
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Page not found"
      message="The page you are looking for does not exist or was moved."
    />
  );
}

export function UnexpectedErrorPage({ onRetry }: { onRetry?: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="auth-wrapper">
      <div className="auth-card" role="alert" aria-live="assertive">
        <div className="auth-header">
          <TriangleAlert className="icon-md" aria-hidden="true" />
          <span className="metric-label">Error</span>
          <h1 className="auth-title">Something went wrong</h1>
          <p className="auth-subtitle">An unexpected error occurred. Try again or return home.</p>
        </div>
        <div className="admin-stack-sm">
          <button
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            className="btn-primary"
          >
            Try again
          </button>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class RouteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <UnexpectedErrorPage onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
