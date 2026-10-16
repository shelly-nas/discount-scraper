-- Full product catalog (regular prices) next to the weekly discounts.
--
-- Catalog fields live on the existing products table, so a product that is
-- both in the catalog and on offer is one row. Every statement is idempotent:
-- fresh installs get the schema from database/src/schema.sql first and then
-- run this file as well.

ALTER TABLE products ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_size VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS regular_price DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_price VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_catalog BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_updated_at TIMESTAMP;

-- The supermarket's own product id; unique per supermarket when known.
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_supermarket_external_id
    ON products(supermarket, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_in_catalog ON products(in_catalog);

-- Regular price per product over time; a row is only written when the price changes.
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at DESC);

-- Catalog runs are tracked apart from discount runs, so the discount
-- scheduling (which reads the last successful scraper_runs row) is unaffected.
CREATE TABLE IF NOT EXISTS catalog_runs (
    id SERIAL PRIMARY KEY,
    supermarket VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    products_seen INTEGER NOT NULL DEFAULT 0,
    products_created INTEGER NOT NULL DEFAULT 0,
    products_updated INTEGER NOT NULL DEFAULT 0,
    prices_changed INTEGER NOT NULL DEFAULT 0,
    products_removed INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_catalog_runs_supermarket ON catalog_runs(supermarket, started_at DESC);

COMMENT ON COLUMN products.external_id IS 'Product id at the supermarket (e.g. AH webshopId); null for offer-only products';
COMMENT ON COLUMN products.regular_price IS 'Regular shelf price from the catalog scrape; null when the product is not in the catalog';
COMMENT ON COLUMN products.in_catalog IS 'True when the product was present in the latest successful catalog scrape';
COMMENT ON TABLE price_history IS 'Regular price changes per product, written by catalog scrapes';
COMMENT ON TABLE catalog_runs IS 'Audit log of full catalog scrapes';
