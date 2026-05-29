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

export const CATEGORY_ICONS: Record<string, string> = DEFAULT_CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat.icon;
  return acc;
}, {} as Record<string, string>);

export const STORES = [
  "Sainsbury's",
  'Tesco',
  'Morrisons',
  'ASDA',
  'M&S',
  'Waitrose',
  'Ocado',
  'Aldi',
  'Lidl',
  'Iceland',
  'Co-op',
] as const;

export type StoreName = typeof STORES[number];

export const STORE_OPTIONS = STORES.map(store => ({ value: store, label: store }));

export const STORE_FAVICONS: Record<string, string> = {
  "Sainsbury's": '/storeicon_sainsburys.png',
  'Tesco': '/storeicon_tesco.png',
  'Morrisons': '/storeicon_morrisons.png',
  'ASDA': '/storeicon_asda.png',
  'M&S': '/storeicon_mands.png',
  'Waitrose': '/storeicon_waitrose.png',
  'Ocado': '/storeicon_ocado.png',
  'Aldi': '/storeicon_aldi.png',
  'Lidl': '/storeicon_lidl.png',
  'Iceland': '/storeicon_iceland.png',
  'Co-op': '/storeicon_co-op.png',
};

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

export interface ScannedItem {
  name: string;
  price: number;
  category?: string;
}

export interface ScannedReceipt {
  store: string | null;
  date: string | null;
  items: ScannedItem[];
  total: number | null;
  rawText: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  imageUrl?: string;
  cleanName?: string;
  extractedPrice?: number;
  brand?: string;
  size?: string;
  suggestedCategory?: string;
  store?: string;
}
