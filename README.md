# DiscountScraper

A web scraper that fetches discount information from Dutch supermarket websites (Albert Heijn, Dirk, Plus) and stores them in a PostgreSQL database with optimized indexing for fast searching and querying.

## Features

- 🛒 Scrapes discounts from multiple supermarkets (AH, Dirk, Plus)
- 💾 PostgreSQL database with optimized indexes
- 🔍 Full-text search on product names
- 📊 Advanced filtering by price, category, and expiration date
- ⚡ 10-15x faster searches compared to JSON storage

## Quick Setup

### 1. Start PostgreSQL Database

```bash
# Using Docker (recommended)
docker compose up -d
```

This automatically creates the database, schema, and seeds supermarket configurations.

### 2. Install Dependencies

```bash
cd scraper
npm install
```

### 3. Configure Environment

Create `.env` file in the project root:

```properties
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discount
DB_USER=discount_user
DB_PASSWORD=your_secure_password
```

### 4. Build & Run

```bash
# Build TypeScript
npm run build

# Run scraper for specific supermarket
npm run ah      # Albert Heijn
npm run dirk    # Dirk
npm run plus    # Plus
```

## Database Setup (Alternative to Docker)

If not using Docker, install PostgreSQL locally:

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Initialize database
psql -U postgres -f database/src/init-db.sql
```

## Usage

### Run Scrapers

```bash
npm run ah          # Scrape Albert Heijn
npm run dirk        # Scrape Dirk
npm run plus        # Scrape Plus
npm run ah:debug    # Debug mode
```

### Query Database

```typescript
// Search products
const products = await productController.searchProducts("chocolate");

// Get active discounts
const discounts = await discountController.getActiveDiscounts();

// Filter by price range
const cheap = await discountController.getDiscountsByPriceRange(0, 5);
```

## Database Schema

- **supermarket_configs** - Scraping configurations
- **products** - Product information with 6 indexes
- **discounts** - Discount data with 5 indexes for fast queries
