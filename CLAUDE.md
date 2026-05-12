# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code style

- **Never use emojis** anywhere in code, UI, or responses. Use proper text labels or icon components (e.g. SVG icons, icon libraries) instead.

## Documentation

- **REQUIRED:** After any functional change (new feature, changed behaviour, removed feature), update [docs/FUNCTIONAL_DESIGN.md](docs/FUNCTIONAL_DESIGN.md) to reflect the new state. Keep it accurate — do not leave stale descriptions.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- **REQUIRED:** After every code change (file edit, creation, or deletion), run `graphify update .` before finishing the task.
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
```

## Architecture

Three Docker services communicate over an internal network:

```
postgres (port 5432) ← scraper-api (port 3001) ← web (port 3010→nginx→3000)
```

### `scraper/` — Express API + API-based scraper clients (TypeScript)

Entry point: [scraper/src/index.ts](scraper/src/index.ts)

**Key layers:**
- **`api/Routes.ts`** — All Express routes under `/api`. Scraping is triggered via `POST /api/scraper/run/:supermarket`.
- **`clients/`** — API-based discount fetchers. `ApiClient` is the abstract base with `fetchDiscounts()`. Concrete clients: `DirkApiClient` (public GraphQL), `AhApiClient` (Playwright intercepts AH GraphQL), `PlusApiClient` (Playwright intercepts OutSystems API), `LidlApiClient` (Playwright HTML scrape with lazy-load scrolling). No DOM scraping remains.
- **`data/PostgresDataManager`** — Facade coordinating the four controllers. `addProductDb` upserts products (deduplicates by name); `addDiscountDb` uses smart logic comparing against the previous batch's `promotion_expire_date` to avoid duplicate discount rows.
- **`controllers/`** — One controller per table (`PostgresProductController`, `PostgresDiscountController`, `PostgresScraperRunController`, `PostgresScheduledRunController`), each receiving a `PostgresDataContext` (singleton pg pool).
- **`services/SchedulerService`** — node-cron job (every minute) that queries `scheduled_runs` for due entries, deactivates expired discounts, and fires scraper runs by making internal `axios.post` calls to its own API.

### `database/` — PostgreSQL init scripts

Schema: [database/src/schema.sql](database/src/schema.sql). Tables:
- `products` — unique per `(name, supermarket)`; upserted on every scrape
- `discounts` — soft-delete via `active` flag; old discounts are marked `active=false` rather than deleted
- `scraper_runs` — audit log of every execution with metrics
- `scheduled_runs` — one row per supermarket, holds `next_run_at` and `promotion_expire_date`

### `web/` — React + Vite frontend (TypeScript)

Routes: `/discounts` (default) and `/configurations`. The Configurations page shows supermarket statuses, dashboard stats, scraper run history, and lets you trigger manual runs or toggle scheduled runs. All data fetched from the scraper API via [web/src/services/api.ts](web/src/services/api.ts). Served by nginx in production (see [web/nginx.conf](web/nginx.conf)).

**Theme system:** `web/src/context/ThemeContext.tsx` provides a `ThemeProvider` and `useTheme` hook. Mode is `system | light | dark`, persisted in `localStorage`. The resolved theme (`light` or `dark`) is applied as `data-theme` on `<html>`. CSS variables in `index.css` are scoped with `:root` (light) and `[data-theme="dark"]`. The toggle button in `TabBar` cycles through all three modes.

## Adding a New Supermarket

1. Create `scraper/src/clients/<Name>ApiClient.ts` extending `ApiClient`; implement `fetchDiscounts()` returning `{ discounts: IProductDiscountDetails[], expireDate: string }`.
2. Register the new client in `scraper/src/utils/ConfigHelper.ts` (`getSupermarketClient` switch).
3. Add the name mappings in `scraper/src/api/Routes.ts` (all `nameMap` objects + `allSupermarkets` array) and `scraper/src/services/SchedulerService.ts` (`nameMap`).
