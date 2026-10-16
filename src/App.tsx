import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/pages/LandingPage';
import RequireAdmin from './components/guards/RequireAdmin';
import { NotFoundPage, RouteErrorBoundary } from './components/guards/ErrorPage';
import { CookieConsent } from './components/ui/CookieConsent';
import ExtensionFAB from './components/layout/ExtensionFAB';

// Landing stays eager (guest first paint). Everything else splits off so
// guests never download signed-in, admin, or auth code up front.
const SearchPage = lazy(() => import('./components/pages/SearchPage'));
const AuthPage = lazy(() => import('./components/pages/AuthPage'));
const WatchlistPage = lazy(() => import('./components/pages/WatchlistPage'));
const ShoppingListPage = lazy(() => import('./components/pages/ShoppingListPage'));
const OffersPage = lazy(() => import('./components/pages/OffersPage'));
const AdminPage = lazy(() => import('./components/pages/AdminPage'));
const SettingsPage = lazy(() => import('./components/pages/SettingsPage'));
// Dev-only: test runner page. Route mounts only under `vite dev`, so this
// chunk is never fetched in prod.
const DevTestsPage = lazy(() => import('./components/pages/DevTestsPage'));
const PrivacyPage = lazy(() =>
  import('./components/pages/LegalPages').then(m => ({ default: m.PrivacyPage }))
);
const CookiesPage = lazy(() =>
  import('./components/pages/LegalPages').then(m => ({ default: m.CookiesPage }))
);
const TermsPage = lazy(() =>
  import('./components/pages/LegalPages').then(m => ({ default: m.TermsPage }))
);
const AboutPage = lazy(() =>
  import('./components/pages/LegalPages').then(m => ({ default: m.AboutPage }))
);
const LicensePage = lazy(() =>
  import('./components/pages/LegalPages').then(m => ({ default: m.LicensePage }))
);

function RouteFallback() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="empty-state-box" aria-live="polite">
          <p className="empty-state-title">Loading</p>
          <p className="empty-state-desc">Getting your page ready.</p>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __SIFT_EXTENSION_INSTALLED?: boolean;
    chrome?: { runtime?: { id?: string } };
  }
}

function HomeRoute() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="empty-state-box" aria-live="polite">
            <p className="empty-state-title">Checking session</p>
            <p className="empty-state-desc">Verifying your session.</p>
          </div>
        </div>
      </div>
    );
  }

  return token ? <SearchPage /> : <LandingPage />;
}

// SPA navigation keeps scroll position — reset to top on every route change
// (e.g. search -> /offers show-all), including ?view switches.
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouteErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/search" element={<Navigate to="/" replace />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/list" element={<ShoppingListPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          {import.meta.env.DEV && <Route path="/dev/tests" element={<DevTestsPage />} />}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/license" element={<LicensePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>
        <ExtensionFAB />
        <CookieConsent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
