CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','user')) DEFAULT 'user',
  is_trial INTEGER NOT NULL DEFAULT 0,
  trial_expires_at INTEGER,
  currency TEXT NOT NULL DEFAULT 'USD',
  default_store TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_users_trial_expires ON users(trial_expires_at) WHERE is_trial = 1;

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  store TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_products_user ON products(user_id);
CREATE INDEX idx_products_user_category ON products(user_id, category);
CREATE INDEX idx_products_user_store ON products(user_id, store);
CREATE INDEX idx_products_user_created ON products(user_id, created_at);

CREATE TABLE prices (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  price REAL NOT NULL,
  store TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_prices_product ON prices(product_id);
CREATE INDEX idx_prices_user_date ON prices(user_id, date);

CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_categories_user ON categories(user_id);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  admin_username TEXT NOT NULL,
  target_user_id TEXT,
  target_username TEXT,
  details TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE INDEX idx_rate_limits_reset ON rate_limits(reset_at);

CREATE TABLE search_cache (
  query_hash TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  results TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_cache_created ON search_cache(created_at);
