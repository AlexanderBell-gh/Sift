import { useState, useEffect } from 'react';

function extensionSignalReceived() {
  const checks = [
    () => window.__SIFT_EXTENSION_INSTALLED,
    () => document.querySelector('meta[name="sift-extension"]')?.getAttribute('content') === 'installed',
    () => document.querySelector('[data-sift-extension]'),
    () => document.getElementById('sift-extension-root'),
    () => document.querySelector('[class*="sift-"], [id*="sift-"]'),
    () => {
      try { return window.chrome?.runtime?.id; } catch { return false; }
    },
  ];
  return checks.some(fn => !!fn());
}

export function useExtensionInstalled() {
  const [installed, setInstalled] = useState(() => extensionSignalReceived());

  useEffect(() => {
    if (installed) return;

    function dismiss() {
      setInstalled(true);
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
  }, [installed]);

  return { installed };
}
