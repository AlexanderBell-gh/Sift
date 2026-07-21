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
  const parts = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (parts) {
    const [, d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d));
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
