CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  branch_id INTEGER NOT NULL,
  source_row INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  name TEXT,
  variant TEXT,
  barcode TEXT,
  location TEXT,
  warehouse TEXT,
  zone TEXT,
  rack TEXT,
  level INTEGER,
  slot INTEGER,
  store_zone TEXT,
  store_rack TEXT,
  store_level INTEGER,
  store_slot INTEGER,
  size TEXT,
  color TEXT,
  brand TEXT,
  category TEXT,
  gender TEXT,
  stock_value REAL,
  has_image INTEGER NOT NULL DEFAULT 0,
  has_location INTEGER NOT NULL DEFAULT 0,
  has_stock INTEGER NOT NULL DEFAULT 0,
  search_text TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_company_branch ON products(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_products_branch_sku ON products(branch_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_branch_barcode ON products(branch_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_branch_brand ON products(branch_id, brand);
CREATE INDEX IF NOT EXISTS idx_products_branch_category ON products(branch_id, category);
CREATE INDEX IF NOT EXISTS idx_products_branch_warehouse ON products(branch_id, warehouse);
CREATE INDEX IF NOT EXISTS idx_products_branch_zone ON products(branch_id, zone);
CREATE INDEX IF NOT EXISTS idx_products_branch_rack ON products(branch_id, rack);
