import { useMemo } from 'react';

export type Browser = 'chrome' | 'firefox' | 'edge' | 'other';

function detectBrowser(): Browser {
  const ua = navigator.userAgent;

  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Chrome')) return 'chrome';

  return 'other';
}

export function useBrowser(): { browser: Browser } {
  const browser = useMemo(() => detectBrowser(), []);
  return { browser };
}
