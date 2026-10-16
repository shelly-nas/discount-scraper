-- Pack quantity in one base unit (kg, l or stuk), so products of different
-- pack sizes can be compared on price per kilo, liter or piece. Derived from
-- the supermarket's pack size; null when it cannot be read.

ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_value DECIMAL(12, 6);
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(10);

COMMENT ON COLUMN products.quantity_value IS 'Pack quantity in quantity_unit, e.g. 0.5 for 500 g';
COMMENT ON COLUMN products.quantity_unit IS 'kg, l or stuk; null when the pack size is unknown';
