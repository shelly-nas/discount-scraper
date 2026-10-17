-- Regular prices taken from offers.
--
-- article_number: the supermarket's permanent article number when it differs
-- from external_id. Lidl gives an offer its own article number (erpNumber);
-- the offer tile and the assortment tile share the permanent one (`nat`), so
-- an offer is linked to its catalog row by this column.
-- price_observed_at: when the supermarket itself last showed regular_price
-- (price_source = 'supermarket'), in its catalog or as the regular price next
-- to an offer. A catalog run does not replace a recently observed price with
-- one from an outside dataset.

ALTER TABLE products ADD COLUMN IF NOT EXISTS article_number VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_observed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_products_article_number
    ON products(supermarket, article_number) WHERE article_number IS NOT NULL;

UPDATE products SET price_observed_at = catalog_updated_at
WHERE price_source = 'supermarket' AND regular_price IS NOT NULL AND price_observed_at IS NULL;

COMMENT ON COLUMN products.article_number IS 'Permanent article number when it differs from external_id (Lidl nat); links offers to the catalog row';
COMMENT ON COLUMN products.price_observed_at IS 'When the supermarket itself last showed regular_price (catalog or regular price next to an offer)';
