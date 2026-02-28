import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `£${price.toFixed(2)}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function calculatePriceChange(prices: { price: number }[]): {
  change: number;
  percent: number;
  direction: 'up' | 'down' | 'neutral';
} {
  if (prices.length < 2) {
    return { change: 0, percent: 0, direction: 'neutral' };
  }

  const current = prices[prices.length - 1].price;
  const previous = prices[prices.length - 2].price;
  const change = current - previous;
  const percent = previous !== 0 ? parseFloat(((change / previous) * 100).toFixed(1)) : 0;

  return {
    change,
    percent,
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
  };
}

export function generateId(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getCategoryBadgeClass(categoryId: string): string {
  return `badge badge-${categoryId}`;
}
