-- Persistent product pool for search autocomplete (names only).
-- Fed by POST /api/watchlist; never deleted by watchlist DELETE.
-- Backfills names already pinned.
CREATE TABLE IF NOT EXISTS product_catalog (
  name TEXT PRIMARY KEY COLLATE NOCASE,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO product_catalog (name, first_seen_at, last_seen_at)
  SELECT DISTINCT product_name, 0, 0 FROM watchlist
  WHERE product_name IS NOT NULL AND TRIM(product_name) != '';
