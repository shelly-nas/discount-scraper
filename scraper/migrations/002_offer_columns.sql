-- Offer columns that were added to database/src/schema.sql after the first
-- deployments. schema.sql only runs on an empty data volume, so existing
-- databases get them here. Idempotent: fresh installs already have both.

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_url TEXT;
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS unit_price VARCHAR(50);
