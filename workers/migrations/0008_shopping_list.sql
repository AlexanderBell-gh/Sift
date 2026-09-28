-- Shopping list: quantities against watchlist rows (watchlist items only).
-- Prices always read live from watchlist; this table stores qty only.
CREATE TABLE IF NOT EXISTS shopping_list (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  watchlist_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (watchlist_id) REFERENCES watchlist(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_user ON shopping_list(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shopping_list_user_item ON shopping_list(user_id, watchlist_id);
