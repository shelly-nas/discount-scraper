# Docker Compose Setup

This document describes the complete Docker Compose setup for the Discount Scraper application.

## Architecture

The application consists of three services:

```
┌─────────────────┐
│   Web (Nginx)   │  Port 3000 (HTTP)
│   React + Vite  │
└────────┬────────┘
         │
         │ Proxies /api requests
         ↓
┌─────────────────┐
│  Scraper API    │  Port 3001 (HTTP)
│  Node.js/TS     │
└────────┬────────┘
         │
         │ Connects to
         ↓
┌─────────────────┐
│   PostgreSQL    │  Port 5432
│   Database      │
└─────────────────┘
```

## Services

### 1. PostgreSQL Database (`postgres`)

- **Image**: `postgres:15-alpine`
- **Port**: 5432 (exposed)
- **Container**: `discount-scraper-db`
- **Health Check**: Built-in PostgreSQL health check
- **Volumes**:
  - `postgres_data` - Persistent database storage
  - SQL initialization scripts mounted from `./database/src/`

### 2. Scraper API (`scraper-api`)

- **Build Context**: `./scraper`
- **Port**: 3001 (exposed)
- **Container**: `discount-scraper-api`
- **Dependencies**: Waits for `postgres` to be healthy
- **Volumes**:
  - `./scraper/logs` - Persistent log files
- **Environment Variables**:
  - `DB_HOST=postgres`
  - `DB_PORT=5432`
  - `DB_NAME`, `DB_USER`, `DB_PASSWORD` (from .env)
  - `API_PORT=3001`
  - `LOG_LEVEL` (defaults to INFO)

### 3. Web Interface (`web`)

- **Build Context**: `./web`
- **Port**: 3000 → 80 (Nginx inside container)
- **Container**: `discount-scraper-web`
- **Dependencies**: Waits for `scraper-api` to start
- **Build**: Multi-stage build (Node.js builder + Nginx runtime)
- **Nginx Config**: Proxies `/api` requests to `scraper-api:3001`

## Quick Start

### 1. Create Environment File

Create `.env` in the project root:

```bash
DB_NAME=discount
DB_USER=discount_user
DB_PASSWORD=your_secure_password_here
LOG_LEVEL=INFO
```

### 2. Build and Start Services

```bash
# Build all services and start in detached mode
docker compose up --build -d
```

This will:

1. Build the database container and initialize schema
2. Build the scraper API container
3. Build the web interface container
4. Start all services with proper dependencies

### 3. Verify Services

```bash
# Check service status
docker compose ps

# Should show all services as "Up" or "healthy"
# - discount-scraper-db (healthy)
# - discount-scraper-api (Up)
# - discount-scraper-web (Up)
```

### 4. Access the Application

- **Web Interface**: http://localhost:3000
- **API Health Check**: http://localhost:3001/health
- **API Discounts**: http://localhost:3001/api/discounts

## Common Commands

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web
docker compose logs -f scraper-api
docker compose logs -f postgres
```

### Restart Services

```bash
# All services
docker compose restart

# Specific service
docker compose restart web
```

### Stop Services

```bash
# Stop but keep containers
docker compose stop

# Stop and remove containers (keeps volumes)
docker compose down

# Stop and remove everything including volumes
docker compose down -v
```

### Rebuild After Changes

```bash
# Rebuild and restart all services
docker compose up --build -d

# Rebuild specific service
docker compose up --build -d web
```

### Access Database

```bash
# Connect to PostgreSQL
docker exec -it discount-scraper-db psql -U discount_user -d discount

# Run SQL file
docker exec -i discount-scraper-db psql -U discount_user -d discount < query.sql
```

### Execute Commands in Containers

```bash
# Access API container shell
docker exec -it discount-scraper-api sh

# Access web container shell
docker exec -it discount-scraper-web sh
```

## Development Workflow

### Making Changes to Web Interface

1. Edit files in `./web/src/`
2. Rebuild the web service:
   ```bash
   docker compose up --build -d web
   ```

### Making Changes to API

1. Edit files in `./scraper/src/`
2. Rebuild the API service:
   ```bash
   docker compose up --build -d scraper-api
   ```

### Updating Database Schema

1. Edit `./database/src/schema.sql`
2. Rebuild with fresh database:
   ```bash
   docker compose down -v
   docker compose up --build -d
   ```

## Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker compose logs

# Check individual service
docker compose logs scraper-api
```

### Database Connection Issues

```bash
# Verify database is healthy
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Restart database
docker compose restart postgres
```

### Web Interface Shows Errors

```bash
# Check web logs
docker compose logs web

# Check if API is accessible
curl http://localhost:3001/health

# Rebuild web
docker compose up --build -d web
```

### Port Already in Use

If you see errors like "port is already allocated":

```bash
# Check what's using the port (macOS/Linux)
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Kill the process or change ports in docker-compose.yml
```

### Clear Everything and Start Fresh

```bash
# Stop and remove all containers, volumes, and networks
docker compose down -v

# Remove built images
docker compose down --rmi all -v

# Rebuild from scratch
docker compose up --build -d
```

## Production Considerations

### Environment Variables

Use strong passwords and consider using Docker secrets:

```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Resource Limits

Add resource constraints to prevent memory issues:

```yaml
services:
  scraper-api:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
```

### Networking

For production, consider:

- Using reverse proxy (Traefik, nginx-proxy)
- Enabling HTTPS with Let's Encrypt
- Restricting database to internal network only

### Backups

Regular database backups:

```bash
# Backup
docker exec discount-scraper-db pg_dump -U discount_user discount > backup.sql

# Restore
docker exec -i discount-scraper-db psql -U discount_user discount < backup.sql
```

## File Structure

```
.
├── docker-compose.yml          # Main orchestration file
├── .env                        # Environment variables
├── database/
│   ├── Dockerfile             # PostgreSQL image
│   └── src/
│       ├── schema.sql         # Database schema
│       └── supermarkets/      # Initial data
├── scraper/
│   ├── Dockerfile             # Node.js API image
│   └── src/                   # API source code
└── web/
    ├── Dockerfile             # Multi-stage build
    ├── nginx.conf             # Nginx configuration
    └── src/                   # React source code
```

## Next Steps

1. Run scrapers to populate data:

   ```bash
   curl -X POST http://localhost:3001/scraper/run/albert-heijn
   curl -X POST http://localhost:3001/scraper/run/dirk
   curl -X POST http://localhost:3001/scraper/run/plus
   ```

2. View data in web interface at http://localhost:3000

3. Set up automated scraping with cron or scheduled tasks
