import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import SearchPage from './components/SearchPage';
import AuthPage from './components/AuthPage';
import WatchlistPage from './components/WatchlistPage';
import AdminPage from './components/AdminPage';
import SettingsPage from './components/SettingsPage';

function extensionSignalReceived() {
  const checks = [
    () => (window as any).__SIFT_EXTENSION_INSTALLED,
    () => document.querySelector('meta[name="sift-extension"]')?.getAttribute('content') === 'installed',
    () => document.querySelector('[data-sift-extension]'),
    () => document.getElementById('sift-extension-root'),
    () => document.querySelector('[class*="sift-"], [id*="sift-"]'),
    () => {
      try { return (window as any).chrome?.runtime?.id; } catch { return false; }
    },
  ];
  return checks.some(fn => !!fn());
}

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/' || location.pathname === '/auth';

  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    if (extensionSignalReceived()) {
      setShowBanner(false);
      return;
    }

    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'SIFT_EXTENSION_INSTALLED') setShowBanner(false);
    }
    window.addEventListener('message', onMessage);

    const observer = new MutationObserver(() => {
      if (extensionSignalReceived()) setShowBanner(false);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const id = setInterval(() => {
      if (extensionSignalReceived()) setShowBanner(false);
    }, 1000);
    const timeout = setTimeout(() => clearInterval(id), 20000);

    return () => {
      window.removeEventListener('message', onMessage);
      observer.disconnect();
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, []);

  const bannerVisible = showBanner && !isAuthPage;

  useEffect(() => {
    if (bannerVisible) {
      document.body.classList.add('has-extension-banner');
    } else {
      document.body.classList.remove('has-extension-banner');
    }
  }, [bannerVisible]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {bannerVisible && (
          <div className="extension-banner">
            <div className="container extension-banner-inner">
              <div className="extension-banner-text">
                <span className="extension-banner-title">Get the Sift browser extension</span>
                <span className="extension-banner-desc">Required for adding products to your Watchlist</span>
              </div>
              <div className="extension-banner-actions">
                <a href="https://github.com/Alex-Projects-Master/sift-extension/releases/download/v0.1.0/sift-extension-0.1.0-chrome.zip" target="_blank" rel="noopener noreferrer" className="extension-banner-btn">
                  Download Extension
                </a>
              </div>
            </div>
          </div>
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
