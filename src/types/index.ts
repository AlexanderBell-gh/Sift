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

export interface UserPreferences {
  currency: string;
  defaultStore?: string;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash?: string;
  role: UserRole;
  preferences: UserPreferences;
  createdAt: string;
  isTrial?: boolean;
  trialExpiresAt?: number | null;
}

export interface MagicLink {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface AuthPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    isTrial?: boolean;
    trialExpiresAt?: number | null;
    preferences: UserPreferences;
  };
  token: string;
  trialDaysRemaining?: number;
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
