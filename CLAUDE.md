# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Development Commands

### Scraper API (`scraper/`)
```bash
cd scraper
npm install
npm run build   # tsc compile to dist/
npm run dev     # build + run (no hot reload)
npm run lint    # eslint check
```

### Web Frontend (`web/`)
```bash
cd web
npm install
npm run dev     # vite dev server
npm run build   # tsc + vite build
npm run lint    # eslint check
```

### Running the full stack
```bash
# Development
cp .env.example .env  # configure DB_NAME, DB_USER, DB_PASSWORD, LOG_LEVEL
docker compose up --build -d

# Rebuild after scraper/web changes
docker compose up --build -d scraper-api  # or: web

# View logs
docker compose logs -f scraper-api

# Direct DB access
docker exec -it discount-scraper-db psql -U discount_user -d discount
```

### Environment variables (`.env` in project root)
```
DB_NAME=discount
DB_USER=discount_user
DB_PASSWORD=change_this_password
LOG_LEVEL=INFO   # DEBUG | INFO | WARN | ERROR
```

## Architecture

Three Docker services communicate over an internal network:

```
postgres (port 5432) ← scraper-api (port 3001) ← web (port 3010→nginx→3000)
```

### `scraper/` — Express API + Playwright scraper (TypeScript)

Entry point: [scraper/src/index.ts](scraper/src/index.ts)

**Key layers:**
- **`api/Routes.ts`** — All Express routes under `/api`. Scraping is triggered via `POST /api/scraper/run/:supermarket`.
- **`clients/`** — Playwright-based scrapers. `WebClient` opens the browser; `SupermarketClient` is an abstract base implementing the scrape loop (navigate → handle cookie popup → get expiry date → iterate categories → extract products). `AhClient`, `DirkClient`, `PlusClient` extend it and implement `getOriginalPrice` / `getDiscountPrice` with site-specific selectors.
- **`data/PostgresDataManager`** — Facade coordinating the four controllers. `addProductDb` upserts products (deduplicates by name); `addDiscountDb` uses smart logic comparing against the previous batch's `promotion_expire_date` to avoid duplicate discount rows.
- **`controllers/`** — One controller per table (`PostgresProductController`, `PostgresDiscountController`, `PostgresScraperRunController`, `PostgresScheduledRunController`), each receiving a `PostgresDataContext` (singleton pg pool).
- **`services/SchedulerService`** — node-cron job (every minute) that queries `scheduled_runs` for due entries, deactivates expired discounts, and fires scraper runs by making internal `axios.post` calls to its own API.

**Supermarket config** is stored in the `supermarket_configs` table (seeded from `database/src/supermarkets/*.sql`). The `web_identifiers` JSONB column holds CSS/Playwright selectors, cookie decline selector, promotion expiry date selector, and product category selectors — no selectors are hardcoded in TypeScript.

### `database/` — PostgreSQL init scripts

Schema: [database/src/schema.sql](database/src/schema.sql). Tables:
- `supermarket_configs` — scraping config (selectors live in `web_identifiers` JSONB)
- `products` — unique per `(name, supermarket)`; upserted on every scrape
- `discounts` — soft-delete via `active` flag; old discounts are marked `active=false` rather than deleted
- `scraper_runs` — audit log of every execution with metrics
- `scheduled_runs` — one row per supermarket, holds `next_run_at` and `promotion_expire_date`

### `web/` — React + Vite frontend (TypeScript)

Routes: `/discounts` (default) and `/configurations`. The Configurations page shows supermarket statuses, dashboard stats, scraper run history, and lets you trigger manual runs or toggle scheduled runs. All data fetched from the scraper API via [web/src/services/api.ts](web/src/services/api.ts). Served by nginx in production (see [web/nginx.conf](web/nginx.conf)).

## Adding a New Supermarket

1. Create `database/src/supermarkets/<name>.sql` with an `INSERT INTO supermarket_configs` including the `web_identifiers` JSON (selectors, categories, etc.).
2. Add the SQL file as a volume mount in `docker-compose.yaml` (in initdb order).
3. Create `scraper/src/clients/<Name>Client.ts` extending `SupermarketClient`; implement `getOriginalPrice`, `getDiscountPrice`, and override `extractProductData` if needed.
4. Register the new client in `scraper/src/utils/ConfigHelper.ts` (`getSupermarketClient`).
5. Add the name mapping in `Routes.ts` (`nameMap`) and `SchedulerService.ts` (`nameMap`).
