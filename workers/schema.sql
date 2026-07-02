CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','user')) DEFAULT 'user',
  is_trial INTEGER NOT NULL DEFAULT 0,
  trial_expires_at INTEGER,
  search_count INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  default_store TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_trial_expires ON users(trial_expires_at) WHERE is_trial = 1;

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

CREATE TABLE IF NOT EXISTS search_cache (
  query_hash TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  results TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_created ON search_cache(created_at);

CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  store TEXT NOT NULL,
  store_logo TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  unit TEXT,
  normal_price REAL,
  loyalty_price REAL,
  unit_price REAL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  loyalty_type TEXT,
  offer_expires_at TEXT,
  product_url TEXT NOT NULL DEFAULT '',
  is_on_offer INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_product ON watchlist(user_id, product_id);

CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  store TEXT NOT NULL,
  normal_price REAL,
  loyalty_price REAL,
  unit_price REAL,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at);

CREATE TABLE IF NOT EXISTS alerts (
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

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, read, triggered_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  target_user_id TEXT,
  target_username TEXT,
  details TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
