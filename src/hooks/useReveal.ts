import { useEffect, useRef } from 'react';

/**
 * Scroll reveals for [data-reveal] descendants — adds `is-visible` once each.
 * Progressive enhancement: the hidden state only applies once `sift-reveal`
 * lands on the root, so no-JS (or no IntersectionObserver) stays visible.
 * Per-element stagger via inline `transitionDelay`, cleared after reveal so
 * hover transitions stay instant.
 */
export function useRevealRoot<T extends HTMLElement>() {
  const rootRef = useRef<T | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    root.classList.add('sift-reveal');
    const els = root.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!els.length) return;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          el.classList.add('is-visible');
          window.setTimeout(() => {
            el.style.transitionDelay = '';
          }, 800);
        }
      },
      { threshold: 0.15 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return rootRef;
}
