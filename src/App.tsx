import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import SearchPage from './components/SearchPage';
import AuthPage from './components/AuthPage';
import WatchlistPage from './components/WatchlistPage';
import AdminPage from './components/AdminPage';
import SettingsPage from './components/SettingsPage';
import { CookieConsent } from './components/ui/CookieConsent';

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
  const [dismissing, setDismissing] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (extensionSignalReceived()) {
      setShowBanner(false);
      return;
    }

    function dismiss() {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setDismissing(true);
    }

    function check() {
      if (extensionSignalReceived()) dismiss();
    }

    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'SIFT_EXTENSION_INSTALLED') dismiss();
    }
    window.addEventListener('message', onMessage);

    function onCustomEvent() { dismiss(); }
    document.addEventListener('sift-extension-installed', onCustomEvent);

    const observer = new MutationObserver(check);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    window.addEventListener('focus', check);
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') check();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    const id = setInterval(check, 1000);
    const timeout = setTimeout(() => clearInterval(id), 20000);

    return () => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('sift-extension-installed', onCustomEvent);
      observer.disconnect();
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(id);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (dismissing) {
      const timer = setTimeout(() => setShowBanner(false), 300);
      return () => clearTimeout(timer);
    }
  }, [dismissing]);

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
          <div className={`extension-banner${dismissing ? ' dismissing' : ''}`}>
            <div className="container extension-banner-inner">
              <div className="extension-banner-text">
                <img src="/favicon.svg" alt="" className="extension-banner-favicon" />
                <span className="extension-banner-title">Sift - Product Extractor</span>
                <span className="extension-banner-desc">Get the official Chrome extension required for adding products to your Watchlist</span>
              </div>
              <div className="extension-banner-actions">
                <a href="https://github.com/Alex-Projects-Master/sift-extension/releases/download/v0.1.1/sift-extension-0.1.1-chrome.zip" target="_blank" rel="noopener noreferrer" className="extension-banner-btn">
                  Download
                </a>
              </div>
            </div>
          </div>
        )}
        <CookieConsent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
