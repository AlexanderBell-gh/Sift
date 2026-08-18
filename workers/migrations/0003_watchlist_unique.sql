-- Dedupe watchlist rows before enforcing uniqueness
DELETE FROM watchlist
WHERE id NOT IN (
  SELECT MIN(id) FROM watchlist GROUP BY user_id, product_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_user_product_unique
  ON watchlist(user_id, product_id);
