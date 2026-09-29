// Canonical watchlist categories. Mirrors CANONICAL_CATEGORIES in
// workers/lib/category.js (no shared build across layers: keep identical).
export const CATEGORIES = [
  'Chilled',
  'Snacks',
  'Beverages',
  'Produce',
  'Frozen',
  'Bakery',
  'Food Cupboard',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];
