# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code style

- **Never use emojis** anywhere in code, UI, or responses. Use proper text labels or icon components (e.g. SVG icons, icon libraries) instead.

## Documentation

- **REQUIRED:** After any functional change (new feature, changed behaviour, removed feature), update [docs/FUNCTIONAL_DESIGN.md](docs/FUNCTIONAL_DESIGN.md) to reflect the new state. Keep it accurate — do not leave stale descriptions.

## Keeping this file current

- **REQUIRED:** After every code change, update this CLAUDE.md to reflect any architectural changes, new/removed files, renamed modules, or changed responsibilities. Keep the Architecture and Adding a New Supermarket sections accurate.

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
CORS_ORIGINS=    # optional, comma separated allowed origins (empty = all)
```

## Architecture

Three Docker services communicate over an internal network:

```
postgres (port 5432) ← scraper-api (port 3001) ← web (port 3010→nginx→3000)
```

### `scraper/` — Express API + API-based scraper clients (TypeScript)

Entry point: [scraper/src/index.ts](scraper/src/index.ts)

**Key layers:**
- **`api/Routes.ts`** — Admin Express routes under `/api` (used by the management `web/`). Scraping is triggered via `POST /api/scraper/run/:supermarket`.
- **`api/PublicRoutes.ts`** — Read-only, versioned consumer API under `/api/public/v1` used by the Baskit app (`/health`, `/supermarkets`, `/categories`, `/search`, `/products/:id`). camelCase responses, only active non-expired discounts, no scraper/scheduler endpoints. Holds its own `SUPERMARKETS` key/name list. CORS origins are restricted via `CORS_ORIGINS` in `index.ts`.
- **`clients/`** — API-based discount fetchers. `ApiClient` is the abstract base with `fetchDiscounts()` returning `{ discounts: IProductDiscountDetails[], expireDate: string }`. Each discount includes a `productUrl` (direct link to the supermarket offer page, or the offers listing page when per-product URLs are unavailable). Concrete clients: `DirkApiClient` (public GraphQL), `AhApiClient` (Playwright intercepts AH GraphQL), `PlusApiClient` (Playwright intercepts OutSystems API), `LidlApiClient` (Playwright HTML scrape with lazy-load scrolling), `AldiApiClient` (Playwright reads `__NEXT_DATA__` double-encoded JSON), `HoogvlietApiClient` (Playwright fetches paginated AJAX via `GetCategoriesForPromotionPage`, parses product HTML per page), `JumboApiClient` (Playwright HTML scrape — waits for Vue hydration, scrolls to load all carousels, reads `expiration-date` attr from `[data-testid="promotion-card"]` elements). All clients set `productUrl` to the supermarket's offers listing page — none of the APIs expose stable per-product deep links.
- **`data/PostgresDataManager`** — Facade coordinating the four controllers. `addProductDb` upserts products (deduplicates by name); `addDiscountDb` uses smart logic comparing against the previous batch's `promotion_expire_date` to avoid duplicate discount rows.
- **`controllers/`** — One controller per table (`PostgresProductController`, `PostgresDiscountController`, `PostgresScraperRunController`, `PostgresScheduledRunController`), each receiving a `PostgresDataContext` (singleton pg pool).
- **`services/SchedulerService`** — node-cron job (every minute) that queries `scheduled_runs` for due entries, deactivates expired discounts, and fires scraper runs by making internal `axios.post` calls to its own API.

### Consumers

The Baskit app (separate repo `shelly-nas/baskit`) reads discount data exclusively through `/api/public/v1` — never directly from the database. In production `scraper-api` joins `shelly-network` so the Baskit nginx container can proxy to `http://discount-scraper-api:3001/api/public/v1`. Keep the public API backwards compatible; breaking changes go into a new version prefix.

### `database/` — PostgreSQL init scripts

Schema: [database/src/schema.sql](database/src/schema.sql). Tables:
- `products` — unique per `(name, supermarket)`; upserted on every scrape; stores `product_url` (offer page link)
- `discounts` — soft-delete via `active` flag; old discounts are marked `active=false` rather than deleted
- `scraper_runs` — audit log of every execution with metrics
- `scheduled_runs` — one row per supermarket, holds `next_run_at` and `promotion_expire_date`

### `web/` — React + Vite frontend (TypeScript)

Routes: `/discounts` (default) and `/configurations`. The Configurations page shows supermarket statuses, dashboard stats, scraper run history, and lets you trigger manual runs or toggle scheduled runs. All data fetched from the scraper API via [web/src/services/api.ts](web/src/services/api.ts). Served by nginx in production (see [web/nginx.conf](web/nginx.conf)).

**Theme system:** `web/src/context/ThemeContext.tsx` provides a `ThemeProvider` and `useTheme` hook. Mode is `system | light | dark`, persisted in `localStorage`. The resolved theme (`light` or `dark`) is applied as `data-theme` on `<html>`. CSS variables in `index.css` are scoped with `:root` (light) and `[data-theme="dark"]`. The toggle button in `TabBar` cycles through all three modes.

## Adding a New Supermarket

1. Create `scraper/src/clients/<Name>ApiClient.ts` extending `ApiClient`; implement `fetchDiscounts()` returning `{ discounts: IProductDiscountDetails[], expireDate: string }`.
2. Register the new client in `scraper/src/utils/ConfigHelper.ts` (`getSupermarketClient` switch).
3. Add the name mappings in `scraper/src/api/Routes.ts` (all `nameMap` objects + `allSupermarkets` array), `scraper/src/api/PublicRoutes.ts` (`SUPERMARKETS`) and `scraper/src/services/SchedulerService.ts` (`nameMap`).
