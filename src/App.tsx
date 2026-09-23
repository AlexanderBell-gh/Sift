import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import SearchPage from './components/SearchPage';
import AuthPage from './components/AuthPage';
import WatchlistPage from './components/WatchlistPage';
import AdminPage from './components/AdminPage';
import SettingsPage from './components/SettingsPage';
import RequireAdmin from './components/RequireAdmin';
import { NotFoundPage, RouteErrorBoundary } from './components/ErrorPage';
import { CookieConsent } from './components/ui/CookieConsent';
import ExtensionFAB from './components/ExtensionFAB';

declare global {
  interface Window {
    __SIFT_EXTENSION_INSTALLED?: boolean;
    chrome?: { runtime?: { id?: string } };
  }
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/search" element={<Navigate to="/" replace />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </RouteErrorBoundary>
        <ExtensionFAB />
        <CookieConsent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
