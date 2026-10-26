import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  const numMatch = dateString.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (numMatch) {
    const [, a, b, y] = numMatch;
    if (Number(a) > 12) {
      return new Date(Number(y), Number(b) - 1, Number(a));
    }
    if (Number(b) > 12) {
      return new Date(Number(y), Number(a) - 1, Number(b));
    }
    return new Date(Number(y), Number(b) - 1, Number(a));
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function isOfferExpired(dateString: string | null): boolean {
  const date = parseDate(dateString);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
}
// Duplicated intentionally with workers/index.js isOfferExpired (no shared build across layers).
// Keep both identical: offers expire end-of-day, so `<=` (not `<`) is correct in both.

// Whole days from today (end-of-day semantics, matching isOfferExpired)
// to an expiry date. Null when no parseable date.
export function daysToExpiry(dateString: string | null): number | null {
  const date = parseDate(dateString);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

const ENDING_SOON_DAYS = 7;

// Shares daysToExpiry so the "Ends in Nd" label and the ending filter can
// never disagree across a DST change; days <= 0 is already expired.
export function isEndingSoon(dateString: string | null): boolean {
  const days = daysToExpiry(dateString);
  return days !== null && days > 0 && days <= ENDING_SOON_DAYS;
}

export function getLoyaltyLabel(store: string): string {
  const labels: Record<string, string> = {
    Tesco: 'Clubcard price',
    "Sainsbury's": 'Nectar price',
    Morrisons: 'More card price',
    'M&S': 'Sparks price',
    Lidl: 'Lidl Plus price',
    ASDA: 'Rollback price',
    Aldi: 'Aldi price',
  };
  return labels[store] ?? 'Offer price';
}

export function getLoyaltyClass(store: string): string {
  const classes: Record<string, string> = {
    Tesco: 'loyalty-tesco',
    "Sainsbury's": 'loyalty-sainsburys',
    Morrisons: 'loyalty-morrisons',
    'M&S': 'loyalty-mns',
    Lidl: 'loyalty-lidl',
    ASDA: 'loyalty-asda',
    Aldi: 'loyalty-aldi',
  };
  return classes[store] ?? '';
}

// Display-only shortener for free-text `offer_deal` (server stores full text).
// "Meal Deal for £15.00 with Nectar" -> "Meal Deal"
// "Any 2 for £8 with Clubcard" -> "Any 2 for £8"
// "Any 2 for £5 Clubcard Price" -> "Any 2 for £5"
// "5 for £5 or 10 for £9 Clubcard Price - Heinz Soup 400g" -> "5 for £5 or 10 for £9"
export function formatDealShort(deal: string): string {
  const withoutLoyalty = deal
    .replace(/\s+[-–—]\s+.*$/, '') // Tesco appends " - <product name>" after the deal
    .replace(/\s+(?:with\s+(?:an?\s+)?(?:nectar|clubcard|loyalty|more\s+card|sparks|lidl\s+plus)(?:\s+card|\+)?|(?:nectar|clubcard|more\s+card|sparks|lidl\s+plus)\s+price)\s*$/i, '')
    .trim();
  const short = /^meal\s+deal\b/i.test(withoutLoyalty) ? 'Meal Deal' : withoutLoyalty;
  return short || deal;
}
