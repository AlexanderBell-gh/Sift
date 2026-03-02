export interface PriceEntry {
  price: number;
  store?: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  url?: string;
  imageUrl?: string;
  category: string;
  store?: string;
  notes?: string;
  prices: PriceEntry[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Beverages', icon: '🥤' },
  { id: 'produce', name: 'Produce', icon: '🥬' },
  { id: 'meat', name: 'Meat', icon: '🥩' },
  { id: 'frozen', name: 'Frozen', icon: '🧊' },
  { id: 'bakery', name: 'Bakery', icon: '🥖' },
  { id: 'other', name: 'Other', icon: '📦' },
];
