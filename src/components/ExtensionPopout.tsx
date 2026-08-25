import { useState, useEffect, useRef } from 'react';
import { useExtensionInstalled } from '../hooks/useExtensionInstalled';
import { cn } from '../lib/utils';

const DISMISS_KEY = 'extension_popout_dismissed';

type PopoutState = 'hidden' | 'visible' | 'dismissing';

export default function ExtensionPopout() {
  const { installed } = useExtensionInstalled();
  const [popoutState, setPopoutState] = useState<PopoutState>('hidden');
  const prevInstalled = useRef(installed);

  useEffect(() => {
    if (!installed && popoutState === 'hidden') {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) return;
      const timer = setTimeout(() => setPopoutState('visible'), 1000);
      return () => clearTimeout(timer);
    }
  }, [installed, popoutState]);

  useEffect(() => {
    if (installed && !prevInstalled.current && popoutState === 'visible') {
      setPopoutState('dismissing');
      const timer = setTimeout(() => setPopoutState('hidden'), 250);
      return () => clearTimeout(timer);
    }
    prevInstalled.current = installed;
  }, [installed, popoutState]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setPopoutState('dismissing');
    setTimeout(() => setPopoutState('hidden'), 250);
  }

  if (popoutState === 'hidden') return null;

  return (
    <div className={cn('extension-popout', popoutState === 'dismissing' && 'extension-popout-dismissing')}>
      <div className="extension-popout-content">
        <img src="/favicon.svg" alt="" className="extension-popout-icon" />
        <div className="extension-popout-text">
          <span className="extension-popout-title">Sift - Product Extractor</span>
          <span className="extension-popout-desc">
            Get the official browser extension to add products directly from store pages
          </span>
        </div>
        <div className="extension-popout-actions">
          <a
            href="https://github.com/Alex-Projects-Master/sift-extension/releases/download/v0.2.5/sift-extension-0.2.5-chrome.zip"
            target="_blank"
            rel="noopener noreferrer"
            className="extension-popout-download"
          >
            Download
          </a>
          <button onClick={dismiss} className="extension-popout-close" aria-label="Dismiss">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
