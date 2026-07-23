import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Cookie } from 'lucide-react';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem('cookie_consent');
    if (!consented) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted');
    setDismissing(true);
    setTimeout(() => setVisible(false), 250);
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[100] transition-all duration-250',
        dismissing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      )}
    >
      <div
        className="mx-auto max-w-3xl mb-4 mx-4 sm:mx-auto rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shadow-2xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              This site uses cookies
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              We store an authentication token in your browser to keep you signed in. No tracking or analytics cookies are used.
            </p>
          </div>
        </div>
        <button
          onClick={accept}
          className="shrink-0 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 text-white btn-press"
          style={{ background: 'var(--primary)' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
