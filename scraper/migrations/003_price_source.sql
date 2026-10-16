-- Where a catalog product's regular price comes from. Most supermarkets
-- publish it themselves ('supermarket'); Lidl does not, so its catalog prices
-- come from an outside dataset ('checkjebon'). Null when no price is known.

ALTER TABLE products ADD COLUMN IF NOT EXISTS price_source VARCHAR(50);

COMMENT ON COLUMN products.price_source IS 'Origin of regular_price: supermarket, checkjebon; null when unknown';
