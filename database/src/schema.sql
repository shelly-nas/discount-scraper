-- PostgreSQL Database Schema for Discount Scraper
-- Created: 2025-10-22

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS supermarket_configs CASCADE;

-- Supermarket Configuration Table
CREATE TABLE supermarket_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    name_short VARCHAR(50),
    url VARCHAR(512) NOT NULL,
    web_identifiers JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on name for faster lookups
CREATE INDEX idx_supermarket_name ON supermarket_configs(name);

-- Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    category VARCHAR(255) NOT NULL,
    supermarket VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, supermarket)
);

-- Create indexes for optimized searching
CREATE INDEX idx_product_name ON products(name);
CREATE INDEX idx_product_category ON products(category);
CREATE INDEX idx_product_supermarket ON products(supermarket);
CREATE INDEX idx_product_name_supermarket ON products(name, supermarket);
CREATE INDEX idx_product_category_supermarket ON products(category, supermarket);

-- Full-text search index for product names
CREATE INDEX idx_product_name_fulltext ON products USING gin(to_tsvector('english', name));

-- Discounts Table
CREATE TABLE discounts (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    original_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_price DECIMAL(10, 2) NOT NULL,
    special_discount VARCHAR(255),
    expire_date TIMESTAMP NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimized searching
CREATE INDEX idx_discount_product_id ON discounts(product_id);
CREATE INDEX idx_discount_expire_date ON discounts(expire_date);
CREATE INDEX idx_discount_price_range ON discounts(discount_price);
CREATE INDEX idx_discount_active ON discounts(active);
-- Note: Partial index with NOW() removed as CURRENT_TIMESTAMP is not immutable
-- Use this query pattern instead: WHERE expire_date > NOW() (will use idx_discount_expire_date)

-- Composite index for common queries
CREATE INDEX idx_discount_product_expire ON discounts(product_id, expire_date);
CREATE INDEX idx_discount_product_active ON discounts(product_id, active);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_supermarket_configs_updated_at BEFORE UPDATE ON supermarket_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE supermarket_configs IS 'Stores supermarket web scraping configuration';
COMMENT ON TABLE products IS 'Stores product information from various supermarkets';
COMMENT ON TABLE discounts IS 'Stores discount information linked to products';

COMMENT ON COLUMN supermarket_configs.web_identifiers IS 'JSON object containing web scraping identifiers';
COMMENT ON COLUMN discounts.special_discount IS 'Additional discount information like quantity or special conditions';
COMMENT ON COLUMN discounts.expire_date IS 'Date when the discount expires';
COMMENT ON COLUMN discounts.active IS 'Whether the discount is currently active (true) or has been deactivated (false)';
