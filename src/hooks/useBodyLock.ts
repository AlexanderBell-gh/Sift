import { useEffect } from 'react';

// Counter-based scroll lock. Multiple sheets (account, filter, alerts,
// store, modal) can hold a lock at once; scroll restores only when the
// last one releases. Replaces direct document.body.style.overflow writes,
// where the last writer won and one sheet closing unlocked the rest.
//
// Locks both documentElement and body: on mobile the scroller is the
// root element, so body-only overflow leaves the page draggable behind
// an open sheet. overscroll-behavior none stops scroll chaining into
// the page from sheet content. Prior values saved and restored, never
// blanked, so pre-existing inline styles survive.
let locks = 0;
let prevHtmlOverflow = '';
let prevBodyOverflow = '';
let prevBodyOverscroll = '';
const LOCK_CLASS = 'sift-locked';

function applyLock() {
  const html = document.documentElement;
  const body = document.body;
  if (locks === 0) {
    prevHtmlOverflow = html.style.overflow;
    prevBodyOverflow = body.style.overflow;
    prevBodyOverscroll = body.style.overscrollBehavior;
  }
  locks += 1;
  // Sticky nav breaks under overflow:hidden ancestors (jumps to page top,
  // off-viewport when scrolled). Flag the lock so CSS can pin it fixed.
  html.classList.add(LOCK_CLASS);
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  body.style.overscrollBehavior = 'none';
}

function releaseLock() {
  locks = Math.max(0, locks - 1);
  if (locks > 0) return;
  document.documentElement.classList.remove(LOCK_CLASS);
  document.documentElement.style.overflow = prevHtmlOverflow;
  document.body.style.overflow = prevBodyOverflow;
  document.body.style.overscrollBehavior = prevBodyOverscroll;
}

export function useBodyLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    applyLock();
    return () => {
      releaseLock();
    };
  }, [locked]);
}
