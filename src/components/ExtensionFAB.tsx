import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useExtensionInstalled } from '../hooks/useExtensionInstalled';
import { useBrowser } from '../hooks/useBrowser';
import { ChromeIcon, FirefoxIcon, EdgeIcon, OtherIcon } from './ui/BrowserIcons';
import { cn } from '../lib/utils';

const BROWSER_ICONS = {
  chrome: ChromeIcon,
  firefox: FirefoxIcon,
  edge: EdgeIcon,
  other: OtherIcon,
} as const;

const EXTENSION_URLS = {
  chrome: 'https://github.com/AlexanderBell-gh/sift-extension/releases/download/v0.2.6/sift-extension-0.2.6-chrome.zip',
  firefox: '#',
  edge: '#',
  other: '#',
} as const;

const TOOLTIP_KEY = 'extension_tooltip_dismissed';

type FabState = 'hidden' | 'visible' | 'dismissing';

export default function ExtensionFAB() {
  const location = useLocation();
  const { installed } = useExtensionInstalled();
  const { browser } = useBrowser();
  const [fabState, setFabState] = useState<FabState>('hidden');
  const [expanded, setExpanded] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevInstalled = useRef(installed);

  const BrowserIcon = BROWSER_ICONS[browser];

  const isAuthPage = location.pathname === '/' || location.pathname === '/auth';

  useEffect(() => {
    if (!installed && fabState === 'hidden' && !isAuthPage) {
      const timer = setTimeout(() => setFabState('visible'), 800);
      return () => clearTimeout(timer);
    }
  }, [installed, fabState, isAuthPage]);

  useEffect(() => {
    if (fabState === 'visible' && !localStorage.getItem(TOOLTIP_KEY)) {
      const timer = setTimeout(() => setTooltipVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [fabState]);

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

  function dismissTooltip() {
    localStorage.setItem(TOOLTIP_KEY, '1');
    setTooltipVisible(false);
  }

  if (fabState === 'hidden' || isAuthPage) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        'extension-fab-container',
        fabState === 'dismissing' && 'extension-fab-dismissing'
      )}
    >
      {tooltipVisible && !expanded && (
        <div className="extension-fab-tooltip">
          <span className="extension-fab-tooltip-text">Click to Download the Sift extension</span>
          <button
            onClick={dismissTooltip}
            className="extension-fab-tooltip-close"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
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
            href={EXTENSION_URLS[browser]}
            target="_blank"
            rel="noopener noreferrer"
            className="extension-fab-download"
          >
            Download
          </a>
        </div>
      )}
      <button
        onClick={() => { setExpanded(!expanded); setTooltipVisible(false); }}
        className="extension-fab-btn"
        aria-label="Get the Sift browser extension"
      >
        <BrowserIcon className="extension-fab-icon" />
      </button>
    </div>
  );
}
