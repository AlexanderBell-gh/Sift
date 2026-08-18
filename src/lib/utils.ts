import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | null): string | null {
  if (value === null) return null;
  return `£${value.toFixed(2)}`;
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

export function cleanDealText(deal: string | null): string | null {
  if (!deal) return deal;
  const cleaned = deal.replace(/\s*-\s*Selected\s+[^-]+Products\s*$/i, '').trim();
  return cleaned || deal;
}
