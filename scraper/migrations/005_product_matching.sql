-- Matching the same product across supermarkets.
--
-- ean: the product barcode, when the supermarket publishes it (Jumbo, some
-- Hoogvliet products). Products with the same ean are the same product.
-- match_brand / match_tokens: the brand and the remaining name words in a
-- normalised form (no pack size, no packaging words), written by the scraper
-- (utils/ProductMatch.ts). Same brand, same quantity and the same name words
-- (ignoring words a supermarket puts in all names of that brand) is the same
-- product. Existing rows are filled on the next start of the scraper.

ALTER TABLE products ADD COLUMN IF NOT EXISTS ean VARCHAR(14);
ALTER TABLE products ADD COLUMN IF NOT EXISTS match_brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS match_tokens TEXT;

CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_match
    ON products(match_brand, quantity_unit, quantity_value) WHERE match_brand IS NOT NULL;

COMMENT ON COLUMN products.ean IS 'Barcode (EAN/GTIN) when the supermarket publishes it';
COMMENT ON COLUMN products.match_brand IS 'Normalised brand (or first name word) for matching the same product across supermarkets';
COMMENT ON COLUMN products.match_tokens IS 'Normalised name words without brand, pack size and packaging words, sorted and space separated';
