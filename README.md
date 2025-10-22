# DiscountScraper

Go to the discount page of a supermarket, scrape the page of discounts and add them to a PostgreSQL database with optimized indexing for fast searching.

## 🎉 New: PostgreSQL Database Migration

This project has been upgraded to use PostgreSQL instead of JSON files for better performance and scalability!

### Quick Start

1. **[QUICKSTART.md](QUICKSTART.md)** - 5-step setup guide
2. **[MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)** - Full migration documentation
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Database architecture and design

### Key Benefits

- ⚡ **10-15x faster** searches with optimized indexes
- 🔍 **Full-text search** on product names
- 📊 **Advanced filtering** by price, category, expiration
- 💾 **Better data integrity** with foreign keys and constraints
- 🔄 **Transaction support** for atomic operations
- 📈 **Scales to millions** of records

## Install

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- TypeScript

### Setup PostgreSQL

**Option 1: Using Docker Compose (Recommended)**

```bash
# Start PostgreSQL in Docker
docker compose up -d

# Check if running
docker ps

# View logs
docker compose logs -f postgres
```

**Option 2: Local Installation**

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Linux
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Initialize Database

```bash
# Edit database/init-db.sql to set a secure password
psql -U postgres -f database/init-db.sql
```

### Install Dependencies

```bash
cd scraper
npm install
```

### Configure Environment

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```properties
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discount
DB_USER=discount_user
DB_PASSWORD=your_secure_password_here

# PostgreSQL configuration (for Docker Compose)
POSTGRES_DB=discount
POSTGRES_USER=discount_user

# Notion API Configuration
NOTION_SECRET=your_notion_secret_here
NOTION_DATABASE_ID=your_notion_database_id_here
```

**Note:** The root `.env` file is used by both Docker Compose and the Node.js application.

### Migrate Data (if you have existing JSON data)

```bash
npm run migrate
```

### Setup Notion Integration

Setup the Notion integration key, see https://www.notion.so/help/add-and-manage-connections-with-the-api.

## Execute

Build the TypeScript project:

```bash
npm run build
```

Run the scraper for a specific supermarket:

```bash
# Albert Heijn
npm run ah

# Dirk
npm run dirk

# Plus
npm run plus

# Or run directly with config
node dist/index.js --config ../config/supermarkets/ah.json
```

### Debug Mode

```bash
npm run ah:debug
npm run dirk:debug
npm run plus:debug
```

## Database Operations

### Query Products

```typescript
import {
  db,
  productController,
} from "./src/examples/postgres-migration-example";

// Search products
const products = await productController.searchProducts("chocolate");

// Get by category
const snacks = await productController.getProductsByCategory("Snacks snoep");

// Get by supermarket
const dirkProducts = await productController.getProductsBySupermarket("Dirk");
```

### Query Discounts

```typescript
import { discountController } from "./src/examples/postgres-migration-example";

// Get active discounts
const activeDiscounts = await discountController.getActiveDiscounts();

// Filter by price range
const cheap = await discountController.getDiscountsByPriceRange(0, 5);

// Get discounts for product
const productDiscounts = await discountController.getDiscountsByProductId(123);
```

See **[scraper/src/examples/postgres-migration-example.ts](scraper/src/examples/postgres-migration-example.ts)** for more examples.

## Functional description

```Gherkin
Feature: Fetch discounts

Scenario:
    Given the discounts are renewed
    And the discounts webpage of '<supermarket>' is visible
    When the current discounts are fetched
    Then the discounts are stored
    And the discount expire date is known

    Examples:
        | supermarket |
        | ah          |
        | dirk        |
        | plus        |
```

## Run as a service

To run your application as a service in production, use PM2:

Install PM2 globally:

```bash
npm install pm2 -g
```

Start your application with PM2:

```bash
pm2 start dist/index.js --name discount-scraper-ah -- --config ../config/supermarkets/ah.json
pm2 start dist/index.js --name discount-scraper-dirk -- --config ../config/supermarkets/dirk.json
pm2 start dist/index.js --name discount-scraper-plus -- --config ../config/supermarkets/plus.json
```

To ensure your application starts on reboot:

```bash
pm2 startup
pm2 save
```

View logs:

```bash
pm2 logs discount-scraper-ah
pm2 monit  # Interactive monitoring
```

## Project Structure

```
DiscountScraper/
├── config/
│   └── supermarkets/          # Supermarket scraping configs
├── database/
│   ├── schema.sql             # PostgreSQL schema with indexes
│   ├── init-db.sql            # Database initialization
│   ├── migrate-to-postgres.ts # Migration script
│   ├── json-db/               # Legacy JSON files
│   └── README.md              # Database documentation
├── scraper/
│   ├── src/
│   │   ├── clients/           # Web scraping clients
│   │   ├── controllers/       # PostgreSQL controllers
│   │   ├── data/              # Database context
│   │   ├── models/            # Data models
│   │   ├── config/            # Configuration
│   │   └── examples/          # Code examples
│   ├── package.json
│   └── .env                   # Environment config
├── QUICKSTART.md              # 5-step setup guide
├── MIGRATION_COMPLETE.md      # Migration documentation
├── ARCHITECTURE.md            # Database design
└── README.md                  # This file
```

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Quick setup in 5 steps
- **[MIGRATION_COMPLETE.md](MIGRATION_COMPLETE.md)** - Detailed migration guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Database architecture and design
- **[database/README.md](database/README.md)** - Database setup and maintenance
- **[CHANGES.md](CHANGES.md)** - Summary of all changes

## Database Schema

### Tables

- **products** - Product information with 6 indexes
- **discounts** - Discount data with 5 indexes including partial index for active discounts
- **supermarket_configs** - Supermarket scraping configuration

### Performance Features

- Full-text search (GIN index) on product names
- Composite indexes for multi-column queries
- Partial index for active discounts (WHERE expire_date > NOW())
- Auto-updating timestamps
- Foreign key constraints with cascade delete
- Connection pooling (max 20 connections)

## Maintenance

### Database Backup

```bash
pg_dump -U discount_scraper_user discount_scraper > backup_$(date +%Y%m%d).sql
```

### Database Restore

```bash
psql -U discount_scraper_user discount_scraper < backup_20251022.sql
```

### Clean Up Expired Discounts

```typescript
const deleted = await discountController.deleteExpiredDiscounts();
console.log(`Removed ${deleted} expired discounts`);
```

### Monitor Performance

```sql
-- Show table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Show index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```
