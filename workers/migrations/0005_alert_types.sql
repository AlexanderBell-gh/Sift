-- Widen alerts.type CHECK to match src/types/index.ts Alert.type
-- (price_drop | offer_expiry | offer_created). SQLite can't alter a CHECK
-- constraint in place, so rebuild the table: create -> copy -> drop -> rename.
CREATE TABLE alerts_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  watchlist_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('price_drop','offer_expiry','offer_created')),
  message TEXT NOT NULL,
  old_price REAL,
  new_price REAL,
  triggered_at INTEGER NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (watchlist_id) REFERENCES watchlist(id) ON DELETE CASCADE
);

INSERT INTO alerts_new (id, user_id, watchlist_id, type, message, old_price, new_price, triggered_at, read)
  SELECT id, user_id, watchlist_id, type, message, old_price, new_price, triggered_at, read FROM alerts;

DROP TABLE alerts;
ALTER TABLE alerts_new RENAME TO alerts;

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, read, triggered_at);