import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useExtensionInstalled } from '../hooks/useExtensionInstalled';
import { cn } from '../lib/utils';

function FabIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path fill="#fff" d="M10.18 0c-2.081 0-3.807 1.608-4 3.64H4.019A4.033 4.033 0 0 0 0 7.66v4.017h1.498a2.13 2.13 0 0 1 2.143 2.144 2.13 2.13 0 0 1-2.143 2.143H0V24h8.036v-1.498a2.13 2.13 0 0 1 2.144-2.143 2.13 2.13 0 0 1 2.143 2.143V24h4.018a4.03 4.03 0 0 0 4.018-4.018v-2.163C22.392 17.627 24 15.901 24 13.821s-1.608-3.807-3.64-4V7.66a4.03 4.03 0 0 0-4.019-4.018h-2.162C13.986 1.608 12.26 0 10.179 0m0 1.875a2.13 2.13 0 0 1 2.143 2.143v1.498h4.018a2.13 2.13 0 0 1 2.143 2.143v4.018h1.498a2.13 2.13 0 0 1 2.143 2.144 2.13 2.13 0 0 1-2.143 2.143h-1.498v4.018a2.13 2.13 0 0 1-2.143 2.143h-2.162c-.193-2.033-1.919-3.64-4-3.64s-3.806 1.607-3.998 3.64H1.875V17.82c2.033-.192 3.64-1.918 3.64-3.998s-1.607-3.807-3.64-4V7.66a2.13 2.13 0 0 1 2.143-2.143h4.018V4.018a2.13 2.13 0 0 1 2.144-2.143" />
    </svg>
  );
}

type FabState = 'hidden' | 'visible' | 'dismissing';

export default function ExtensionFAB() {
  const location = useLocation();
  const { installed } = useExtensionInstalled();
  const [fabState, setFabState] = useState<FabState>('hidden');
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevInstalled = useRef(installed);

  const isAuthPage = location.pathname === '/' || location.pathname === '/auth';

  useEffect(() => {
    if (!installed && fabState === 'hidden' && !isAuthPage) {
      const timer = setTimeout(() => setFabState('visible'), 800);
      return () => clearTimeout(timer);
    }
  }, [installed, fabState, isAuthPage]);

  useEffect(() => {
    if (installed && !prevInstalled.current && fabState === 'visible') {
      setFabState('dismissing');
      const timer = setTimeout(() => setFabState('hidden'), 250);
      return () => clearTimeout(timer);
    }
    prevInstalled.current = installed;
  }, [installed, fabState]);

  useEffect(() => {
    if (!expanded) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  if (fabState === 'hidden') return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'extension-fab-container',
        fabState === 'dismissing' && 'extension-fab-dismissing'
      )}
    >
      {expanded && (
        <div className="extension-fab-panel">
          <button
            onClick={() => setExpanded(false)}
            className="extension-fab-close"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="extension-fab-panel-text">
            <img src="/favicon.svg" alt="" className="extension-fab-panel-icon" />
            <div>
              <span className="extension-fab-panel-title">Sift - Product Extractor</span>
              <span className="extension-fab-panel-desc">Get the official extension to add products directly from store pages</span>
            </div>
          </div>
          <a
            href="https://github.com/Alex-Projects-Master/sift-extension/releases/download/v0.2.5/sift-extension-0.2.5-chrome.zip"
            target="_blank"
            rel="noopener noreferrer"
            className="extension-fab-download"
          >
            Download
          </a>
        </div>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="extension-fab-btn"
        aria-label="Get the Sift browser extension"
      >
        <FabIcon className="extension-fab-icon" />
      </button>
    </div>
  );
}
