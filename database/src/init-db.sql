-- Initialize Database for Discount Scraper
-- This script creates the database and user

-- Create database (run as postgres superuser)
CREATE DATABASE discount_scraper;

-- Connect to the database
\c discount_scraper;

-- Create user (if not exists)
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'discount_scraper_user') THEN
      CREATE USER discount_scraper_user WITH PASSWORD 'your_secure_password_here';
   END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE discount_scraper TO discount_scraper_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO discount_scraper_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO discount_scraper_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO discount_scraper_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO discount_scraper_user;

-- Now run the schema.sql file to create tables
\i schema.sql
