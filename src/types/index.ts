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
  notes: string | null;
  created_at: number;
  updated_at: number;
}
