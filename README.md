# DiscountScraper

A containerized web scraper with REST API that fetches discount information from Dutch supermarket websites (Albert Heijn, Dirk, Plus) and stores them in a PostgreSQL database with optimized indexing for fast searching and querying.

## Features

- 🛒 Scrapes discounts from multiple supermarkets (AH, Dirk, Plus)
- 🌐 Modern web interface with Notion-like design
- 📡 REST API for triggering scraper runs
- � Comprehensive run tracking with detailed metrics
- �🐳 Fully containerized with Docker
- 💾 PostgreSQL database with optimized indexes
- 🔍 Full-text search on product names
- � Advanced filtering by price, category, and expiration date
- ⚡ 10-15x faster searches compared to JSON storage
- 📝 Full audit trail of all scraper executions

## Deployment Options

### Option 1: Local Development with Docker (Recommended for Development)

**1. Configure Environment**

Create `.env` file in the project root:

```properties
DB_NAME=discount
DB_USER=discount_user
DB_PASSWORD=discount_pass
LOG_LEVEL=INFO
```

**2. Start All Services**

```bash
# Build and start all services (database, API, and web interface)
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Option 2: Production Deployment with CI/CD (NAS/Server)

This project includes automated CI/CD workflows for building images and deploying to your NAS.

**Architecture:**

1. **Build & Push**: Builds Docker images and pushes to your local registry
2. **Deploy**: Pulls images from registry and deploys to your NAS

**Setup:**

1. Set up a local Docker registry on your NAS (see [Workflow README](./.github/workflows/README.md))
2. Configure GitHub secrets (registry URL, credentials, database settings)
3. Push to `main` branch - automatic build and deploy

**Manual deployment:**

```bash
# Use production compose file with registry images
REGISTRY=your-registry:5000 IMAGE_TAG=latest docker compose -f docker-compose.prod.yaml up -d
```

See [.github/workflows/README.md](./.github/workflows/README.md) for detailed setup instructions.

This automatically creates:

- PostgreSQL database with schema and supermarket configurations
- Scraper API service on port 3001
- Web interface on port 3000

### 3. Access the Application

**Web Interface:** http://localhost:3000

**API Endpoints:**

```bash
# Health check
curl http://localhost:3001/health

# Get all discounts
curl http://localhost:3001/api/discounts

# Run scrapers
curl -X POST http://localhost:3001/scraper/run/albert-heijn
curl -X POST http://localhost:3001/scraper/run/dirk
curl -X POST http://localhost:3001/scraper/run/plus
```

## Services

The application consists of three Docker services:

- **postgres** (`discount-scraper-db`) - Port 5432
- **scraper-api** (`discount-scraper-api`) - Port 3001
- **web** (`discount-scraper-web`) - Port 3000

## Web Interface

The web interface provides a clean, Notion-inspired UI for viewing and filtering discounts:

- **Database View**: Table display of all products and discounts
- **Global Search**: Search across all columns simultaneously
- **Column Filters**: Individual text filters for each column
- **Quick Filters**: Expire Date, Category, and Product Name
- **Default Sorting**: Automatically sorted by expiration date, category, and name
- **Responsive Design**: Works on desktop and mobile

Access at: **http://localhost:3000**

## API Usage

### Endpoints

**Health Check**

```bash
curl http://localhost:3001/health
```

**Get All Discounts**

```bash
curl http://localhost:3001/api/discounts
```

**Run Scraper**

```bash
curl -X POST http://localhost:3001/api/scraper/run/:supermarket
```

**Get Scraper Runs**

```bash
# Get all runs
curl http://localhost:3001/api/scraper/runs

# Get runs for specific supermarket
curl http://localhost:3001/api/scraper/runs/albert-heijn

# Get specific run by ID
curl http://localhost:3001/api/scraper/run/1
```

**Dashboard Statistics**

```bash
curl http://localhost:3001/api/dashboard/stats
# Returns: totalRuns, successRate, scrapedProducts, uniqueProducts
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
- **products** - Product information with 6 indexes (unique constraint on name + supermarket)
- **discounts** - Discount data with 7 indexes for fast queries, includes `active` flag
- **scraper_runs** - Complete audit trail of all scraper executions with metrics

### UPSERT Logic

Products are updated instead of deleted when re-scraping. The unique identifier is the combination of product name and supermarket. When new discounts are scraped, old discounts are marked as `active=false` rather than deleted, preserving historical data.

### Run Tracking

Every scraper execution is tracked with detailed metrics including:

- Products scraped, created, and updated
- Discounts deactivated and created
- Run duration and status
- Error messages for failed runs

For detailed information:

- [Database Migration Guide](./docs/DATABASE_MIGRATION.md)
- [Scraper Run Tracking](./docs/SCRAPER_RUN_TRACKING.md)

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

- [Web Interface Documentation](./web/README.md)
- [API Documentation](./scraper/README.md)
- [Database Schema](./database/src/schema.sql)
- [Supermarket Configurations](./database/src/supermarkets/)
