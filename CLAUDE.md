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
CATALOG_ENABLED=true          # weekly full catalog scrape on/off
CATALOG_CRON=17 3 * * 1       # when the catalog scrape runs
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
- **`api/PublicRoutes.ts`** — Read-only, versioned consumer API under `/api/public/v1` used by the Baskit app (`/health`, `/supermarkets`, `/categories`, `/search`, `/products/:id`, `POST /compare`). camelCase responses, no scraper/scheduler endpoints; `/search` and `/categories` take `scope=offers|all`, `/products/:id` includes `catalog` and `priceHistory`. Search logic lives in `ProductSearch.ts`. CORS origins are restricted via `CORS_ORIGINS` in `index.ts`.
- **`clients/`** — API-based discount fetchers. `ApiClient` is the abstract base with `fetchDiscounts()` returning `{ discounts: IProductDiscountDetails[], expireDate: string }`. Each discount includes a `productUrl` (direct link to the supermarket offer page, or the offers listing page when per-product URLs are unavailable). Concrete clients: `DirkApiClient` (public GraphQL), `AhApiClient` (Playwright intercepts AH GraphQL), `PlusApiClient` (Playwright intercepts OutSystems API), `LidlApiClient` (Playwright HTML scrape with lazy-load scrolling), `AldiApiClient` (Playwright reads `__NEXT_DATA__` double-encoded JSON), `HoogvlietApiClient` (Playwright fetches paginated AJAX via `GetCategoriesForPromotionPage`, parses product HTML per page), `JumboApiClient` (Playwright HTML scrape — waits for Vue hydration, scrolls to load all carousels, reads `expiration-date` attr from `[data-testid="promotion-card"]` elements). All clients set `productUrl` to the supermarket's offers listing page — none of the APIs expose stable per-product deep links.
- **`api/ProductSearch.ts`** — Search SQL shared by the public endpoints: one current (cheapest active) discount per product via `CURRENT_DISCOUNT_JOIN`, `scope` `offers` (default) or `all` (also catalog products at regular price), relevance ranking, `mapSearchRow` response shape (`price`, `discount`, `catalog`). Also owns the `SUPERMARKETS` key/name list re-exported by `PublicRoutes.ts`.
- **`api/PriceComparison.ts`** — `compareList` behind `POST /api/public/v1/compare`: per list item one `DISTINCT ON (supermarket)` query picking the best match per supermarket (all words in the name, at least one as a whole word; ranked by whole-word matches, then current price, then name length), retried without size tokens; an item's own `productId` is used as is at its supermarket.
- **`api/CatalogRoutes.ts`** — Admin catalog endpoints under `/api/catalog`: `GET /status`, `GET /runs`, `POST /run/:supermarket` (202, runs in the background).
- **`clients/catalog/`** — Full assortment fetchers at regular price. `CatalogClient` (abstract, `fetchCatalog(onPage)` streams pages), `AhCatalogClient` (AH mobile API: anonymous token, categories, paged product search; retries on 401/429/5xx). Registered in `ConfigHelper.getCatalogClient` / `CATALOG_SUPERMARKETS`. No Dirk client yet: `src/scripts/discoverDirkCatalog.ts` (`npm run discover:dirk`) lists Dirk's GraphQL queries to find the assortment query.
- **`services/CatalogService`** — Starts catalog runs (one per supermarket at a time), upserts pages through `controllers/PostgresCatalogController` (match on `(supermarket, external_id)`, then adopts an offer-only row with the same name; `price_history` row only when the regular price changes), marks products not seen as `in_catalog = false` unless the run saw under 50% of the known products, and records `catalog_runs`. `SchedulerService.startCatalogSchedule` runs all of them on `CATALOG_CRON` (default `17 3 * * 1`, off with `CATALOG_ENABLED=false`).
- **`data/Migrations.ts`** — Applies `scraper/migrations/NNN_*.sql` on startup (recorded in `schema_migrations`, one transaction per file). Every schema change after the base `database/src/schema.sql` goes into a new numbered migration; the Dockerfile copies the directory.
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
- `products` catalog columns (migration 001): `external_id`, `brand`, `unit_size`, `image_url`, `regular_price`, `unit_price`, `in_catalog`, `catalog_updated_at`
- `price_history` — regular price changes per product; `catalog_runs` — audit log of catalog scrapes; `schema_migrations` — applied migrations

### `web/` — React + Vite frontend (TypeScript)

Routes: `/discounts` (default) and `/configurations`. The Configurations page shows supermarket statuses, dashboard stats, scraper run history, and lets you trigger manual runs or toggle scheduled runs. Its "Product Catalog" section (`components/CatalogSection.tsx`) shows catalog status per supported supermarket and starts catalog runs. All data fetched from the scraper API via [web/src/services/api.ts](web/src/services/api.ts). Served by nginx in production (see [web/nginx.conf](web/nginx.conf)).

**Theme system:** `web/src/context/ThemeContext.tsx` provides a `ThemeProvider` and `useTheme` hook. Mode is `system | light | dark`, persisted in `localStorage`. The resolved theme (`light` or `dark`) is applied as `data-theme` on `<html>`. CSS variables in `index.css` are scoped with `:root` (light) and `[data-theme="dark"]`. The toggle button in `TabBar` cycles through all three modes.

## Adding a Catalog Scraper

1. Create `scraper/src/clients/catalog/<Name>CatalogClient.ts` extending `CatalogClient`; deliver `ICatalogProduct` pages through `onPage` with a stable `externalId` and the regular (non-promotion) price.
2. Register it in `getCatalogClient` and add the name to `CATALOG_SUPERMARKETS` in `scraper/src/utils/ConfigHelper.ts`.

## Adding a New Supermarket

1. Create `scraper/src/clients/<Name>ApiClient.ts` extending `ApiClient`; implement `fetchDiscounts()` returning `{ discounts: IProductDiscountDetails[], expireDate: string }`.
2. Register the new client in `scraper/src/utils/ConfigHelper.ts` (`getSupermarketClient` switch).
3. Add the name mappings in `scraper/src/api/Routes.ts` (all `nameMap` objects + `allSupermarkets` array), `scraper/src/api/ProductSearch.ts` (`SUPERMARKETS`) and `scraper/src/services/SchedulerService.ts` (`nameMap`).
