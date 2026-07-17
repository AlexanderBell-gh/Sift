export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isTrial: boolean;
  trialExpiresAt: number | null;
}

export interface SearchResult {
  id: string;
  name: string;
  store: string;
  store_logo: string;
  image_url: string;
  unit: string | null;
  prices: {
    normal: number | null;
    loyalty: number | null;
    unit_price: number | null;
    currency: string;
  };
  loyalty_type: string | null;
  offer_expires_at: string | null;
  category: string | null;
  product_url: string;
  is_on_offer: boolean;
}

export interface WatchlistItem {
  id: string;
  product_id: string;
  product_name: string;
  store: string;
  store_logo: string;
  image_url: string;
  unit: string | null;
  prices: {
    normal: number | null;
    loyalty: number | null;
    unit_price: number | null;
    currency: string;
  };
  loyalty_type: string | null;
  offer_expires_at: string | null;
  product_url: string;
  is_on_offer: boolean;
  category: string | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface Alert {
  id: string;
  user_id: string;
  watchlist_id: string;
  type: 'price_drop' | 'offer_expiry' | 'offer_created';
  message: string;
  old_price: number | null;
  new_price: number | null;
  triggered_at: number;
  read: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  isTrial: boolean;
  trialExpiresAt: number | null;
  createdAt: string;
  productCount: number;
}

export interface AdminUserDetail extends AdminUser {
  preferences: { currency: string; defaultStore: string | null } | null;
  totalPrices: number;
  products: { id: string; name: string; store: string; priceCount: number }[];
}

export interface AuditLog {
  id: string;
  action: string;
  admin_id: string;
  admin_username: string;
  target_user_id: string | null;
  target_username: string | null;
  details: string | null;
  timestamp: number;
}

export interface AdminStats {
  totalUsers: number;
  regularUsers: number;
  trialUsers: number;
  totalProducts: number;
  totalPrices: number;
}

export interface AdminAnalytics {
  storeDistribution: Record<string, number>;
  totalProducts: number;
  totalPriceEntries: number;
  userCount: number;
  regularUsers: number;
  trialUsers: number;
  userRegistrations: { date: string; count: number }[];
}

export interface TrialUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  trialExpiresAt: number | null;
  isExpired: boolean;
  productCount: number;
}
