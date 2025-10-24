# DiscountScraper

A containerized web scraper with REST API that fetches discount information from Dutch supermarket websites (Albert Heijn, Dirk, Plus) and stores them in a PostgreSQL database with optimized indexing for fast searching and querying.

## Features

- 🛒 Scrapes discounts from multiple supermarkets (AH, Dirk, Plus)
- � REST API for triggering scraper runs
- 🐳 Fully containerized with Docker
- �💾 PostgreSQL database with optimized indexes
- 🔍 Full-text search on product names
- 📊 Advanced filtering by price, category, and expiration date
- ⚡ 10-15x faster searches compared to JSON storage

## Quick Setup with Docker (Recommended)

### 1. Configure Environment

Create `.env` file in the project root:

```properties
DB_NAME=discount
DB_USER=discount_user
DB_PASSWORD=discount_pass
LOG_LEVEL=INFO
```

### 2. Start All Services

```bash
# Build and start database + API
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

This automatically creates:

- PostgreSQL database with schema and supermarket configurations
- Scraper API service on port 3000

### 3. Use the API

```bash
# Health check
curl http://localhost:3000/health

# Run scrapers
curl -X POST http://localhost:3000/scraper/run/albert-heijn
curl -X POST http://localhost:3000/scraper/run/dirk
curl -X POST http://localhost:3000/scraper/run/plus
```

## Services

The application consists of two Docker services:

- **postgres** (`discount-scraper-db`) - Port 5432
- **scraper-api** (`discount-scraper-api`) - Port 3000

## Development Setup (Without Docker)

### 1. Install PostgreSQL

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Initialize database
psql -U postgres -f database/src/init-db.sql
```

### 2. Install Dependencies

```bash
cd scraper
npm install
```

### 3. Configure Environment

```properties
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discount
DB_USER=discount_user
DB_PASSWORD=your_secure_password
API_PORT=3000
```

### 4. Build & Run

```bash
npm run build
npm start
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

## API Usage

### Endpoints

**Health Check**

```bash
curl http://localhost:3000/health
```

**Run Scraper**

```bash
curl -X POST http://localhost:3000/scraper/run/:supermarket
```

Where `:supermarket` is one of: `albert-heijn`, `ah`, `dirk`, or `plus`

**Example Response**

```json
{
  "success": true,
  "message": "Scraper completed for Albert Heijn",
  "data": {
    "supermarket": "Albert Heijn",
    "productsScraped": 150,
    "timestamp": "2025-10-23T12:00:00.000Z"
  }
}
```

### Query Database

```bash
# Access database directly
docker exec -it discount-scraper-db psql -U discount_user -d discount

# Example queries
SELECT * FROM products WHERE supermarket = 'Albert Heijn' LIMIT 10;
SELECT * FROM discounts WHERE expire_date > NOW() ORDER BY discount_price;
```

## Database Schema

- **supermarket_configs** - Scraping configurations
- **products** - Product information with 6 indexes
- **discounts** - Discount data with 5 indexes for fast queries

## Docker Commands

```bash
# Start services
docker compose up -d

# Rebuild after changes
docker compose up --build -d

# View logs
docker compose logs -f
docker compose logs -f scraper-api
docker compose logs -f postgres

# Stop services (keep data)
docker compose down

# Stop and remove all data
docker compose down -v

# Check service status
docker compose ps
```

## Troubleshooting

**Containers won't start**

```bash
docker compose logs
docker compose restart
```

**Database connection issues**

```bash
docker compose ps              # Check if postgres is healthy
docker compose restart postgres
```

**API not responding**

```bash
docker logs discount-scraper-api
docker compose restart scraper-api
```

## Documentation

- [API Documentation](./scraper/README.md)
- [Database Schema](./database/src/schema.sql)
- [Supermarket Configurations](./database/src/supermarkets/)
