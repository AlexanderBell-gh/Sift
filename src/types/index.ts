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
  trialHoursRemaining?: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'chilled', name: 'Chilled', icon: '🥛' },
  { id: 'snacks', name: 'Snacks', icon: '🍿' },
  { id: 'beverages', name: 'Beverages', icon: '🥤' },
  { id: 'produce', name: 'Produce', icon: '🥬' },
  { id: 'frozen', name: 'Frozen', icon: '🧊' },
  { id: 'bakery', name: 'Bakery', icon: '🥖' },
  { id: 'pantry', name: 'Pantry', icon: '🥫' },
  { id: 'condiments', name: 'Condiments', icon: '🧂' },
  { id: 'other', name: 'Other', icon: '📦' },
];

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isTrial: boolean;
  trialExpiresAt: number | null;
  createdAt: string;
  productCount: number;
}

export interface AdminUserProduct {
  id: string;
  name: string;
  category: string;
  store?: string;
  priceCount: number;
}

export interface AdminUserDetail extends AdminUser {
  preferences: UserPreferences;
  productCount: number;
  totalPrices: number;
  products: AdminUserProduct[];
}

export interface AdminTrial {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  trialExpiresAt: number;
  isExpired: boolean;
  productCount: number;
}

export interface AuditLog {
  id: string;
  action: 'admin.user_delete' | 'admin.role_change' | 'admin.trials_cleanup';
  adminId: string;
  adminUsername: string;
  targetUserId?: string;
  targetUsername?: string;
  details: string;
  timestamp: number;
}

export interface ProductAnalysis {
  name: string;
  url: string;
  price: number;
  currency: string;
  imageUrl?: string;
  inStock?: boolean;
  store?: string;
}
