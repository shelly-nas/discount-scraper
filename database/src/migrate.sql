-- Idempotent migrations for existing deployments
-- Run automatically after schema.sql via docker-entrypoint-initdb.d ordering

ALTER TABLE products ADD COLUMN IF NOT EXISTS product_url TEXT;

COMMENT ON COLUMN products.product_url IS 'Direct URL to the product/offer page on the supermarket website — null when not available';
