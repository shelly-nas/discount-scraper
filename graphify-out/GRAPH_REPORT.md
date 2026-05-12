# Graph Report - .  (2026-05-12)

## Corpus Check
- Corpus is ~24,942 words - fits in a single context window. You may not need a graph.

## Summary
- 327 nodes · 453 edges · 32 communities (10 shown, 22 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.89)
- Token cost: 130,299 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Supermarket Scraping Core|Supermarket Scraping Core]]
- [[_COMMUNITY_Data Models & Config|Data Models & Config]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_API Routes|API Routes]]
- [[_COMMUNITY_Discount Controller|Discount Controller]]
- [[_COMMUNITY_Logger Utilities|Logger Utilities]]
- [[_COMMUNITY_Product Controller|Product Controller]]
- [[_COMMUNITY_Frontend Discount View|Frontend Discount View]]
- [[_COMMUNITY_Frontend Config & App|Frontend Config & App]]
- [[_COMMUNITY_Data Manager Facade|Data Manager Facade]]
- [[_COMMUNITY_Scheduled Run Controller|Scheduled Run Controller]]
- [[_COMMUNITY_Scraper Run Controller|Scraper Run Controller]]
- [[_COMMUNITY_Postgres Data Context|Postgres Data Context]]
- [[_COMMUNITY_Scheduler Service|Scheduler Service]]
- [[_COMMUNITY_Plus Supermarket Client|Plus Supermarket Client]]
- [[_COMMUNITY_Albert Heijn Client|Albert Heijn Client]]
- [[_COMMUNITY_Web Browser Client|Web Browser Client]]
- [[_COMMUNITY_Dirk Supermarket Client|Dirk Supermarket Client]]
- [[_COMMUNITY_DateTime Handler|DateTime Handler]]
- [[_COMMUNITY_Supermarket Web Interfaces|Supermarket Web Interfaces]]
- [[_COMMUNITY_Docker Deployment|Docker Deployment]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_Product Model|Product Model]]
- [[_COMMUNITY_Scraper Run Model|Scraper Run Model]]
- [[_COMMUNITY_Filter Bar Component|Filter Bar Component]]
- [[_COMMUNITY_Discount Details Interface|Discount Details Interface]]
- [[_COMMUNITY_Product Data Extraction|Product Data Extraction]]
- [[_COMMUNITY_Date Parsing Bridge|Date Parsing Bridge]]
- [[_COMMUNITY_Vite Build Config|Vite Build Config]]
- [[_COMMUNITY_DateTime Handler Entry|DateTime Handler Entry]]
- [[_COMMUNITY_Column Filter Type|Column Filter Type]]

## God Nodes (most connected - your core abstractions)
1. `ScraperLogger` - 25 edges
2. `PostgresDiscountController` - 20 edges
3. `PostgresProductController` - 15 edges
4. `ServerLogger` - 14 edges
5. `PostgresDataManager` - 13 edges
6. `PostgresScheduledRunController` - 12 edges
7. `PostgresScraperRunController` - 12 edges
8. `PostgresDataManager` - 10 edges
9. `Configurations Page` - 10 edges
10. `DiscountsView Page` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Notion-Inspired UI Design` --rationale_for--> `DatabaseTable Component`  [INFERRED]
  docs/FUNCTIONAL_DESIGN.md → web/src/components/DatabaseTable.tsx
- `Notion-Inspired UI Design` --rationale_for--> `DiscountsView Page`  [INFERRED]
  docs/FUNCTIONAL_DESIGN.md → web/src/pages/DiscountsView.tsx
- `Client-Side Filtering Pattern` --rationale_for--> `DiscountsView Page`  [INFERRED]
  docs/FUNCTIONAL_DESIGN.md → web/src/pages/DiscountsView.tsx
- `Client-Side Filtering Pattern` --rationale_for--> `DatabaseView Page`  [INFERRED]
  docs/FUNCTIONAL_DESIGN.md → web/src/pages/DatabaseView.tsx
- `UPSERT Product Deduplication Pattern` --rationale_for--> `Product Interface`  [INFERRED]
  docs/FUNCTIONAL_DESIGN.md → web/src/types/index.ts

## Hyperedges (group relationships)
- **Full Scrape Pipeline: Config -> Client -> DataManager -> DB** — routes_routes, confighelper_getsupermarketclient, supermarketclient_supermarketclient, postgresdatamanager_addproductdb, postgresdatamanager_adddiscountdb, postgresdatacontext_datacontext [INFERRED 0.95]
- **Controller Layer: Four Postgres Controllers over shared DataContext** — postgresproductcontroller_controller, postgresdiscountcontroller_controller, postgresscraperruncontroller_controller, postgresscheduledruncontroller_controller, postgresdatacontext_datacontext [EXTRACTED 1.00]
- **Supermarket Client Polymorphism: WebClient -> SupermarketClient -> Concrete Clients** — webclient_webclient, supermarketclient_supermarketclient, plusclient_plusclient, ahclient_ahclient, dirkclient_dirkclient [EXTRACTED 1.00]
- **DiscountsView Data Loading and Filtering Flow** — discountsview_discountsview, api_discountservice, api_getallDiscounts, types_productwithDiscount, databasetable_databasetable [INFERRED 0.95]
- **Configurations Page Scraper Management Flow** — configurations_configurations, api_configurationsservice, confirmdialog_confirmdialog, types_scraperrun, types_supermarketstatus [INFERRED 0.95]
- **Three-Tier Docker Deployment Architecture** — docker_compose_dev, docker_compose_prod, traefik_routing, shelly_network [INFERRED 0.85]

## Communities (32 total, 22 thin omitted)

### Community 0 - "Supermarket Scraping Core"
Cohesion: 0.08
Nodes (16): extractProductData(), getDiscountProductDetails(), DatabaseConfig, getDatabaseConfig(), DiscountRow, ScheduledRunRow, ScraperRunRow, DatabaseConfig (+8 more)

### Community 1 - "Data Models & Config"
Cohesion: 0.09
Nodes (39): AhClient, Albert Heijn Supermarket DB Config (SQL seed), getSupermarketClient (Factory), getDatabaseConfig, DateTimeHandler.getDateTimeString, Dirk Supermarket DB Config (SQL seed), DirkClient, DiscountModel (+31 more)

### Community 2 - "UI Components"
Cohesion: 0.1
Nodes (13): ConfirmDialogProps, DatabaseTableProps, SearchBarProps, TabType, configurationsService, discountService, ColumnFilter, ConfigurationsStats (+5 more)

### Community 3 - "API Routes"
Cohesion: 0.1
Nodes (17): allSupermarkets, dataManager, dbRow, discountController, earliestRun, nameMap, nameToKeyMap, router (+9 more)

### Community 7 - "Frontend Discount View"
Cohesion: 0.23
Nodes (15): discountService API, getAllDiscounts Method, getDiscountsByFilter Method, Client-Side Filtering Pattern, DatabaseTable Component, DatabaseView Page, Discount Lifecycle (Active/Inactive), DiscountsView Page (+7 more)

### Community 8 - "Frontend Config & App"
Cohesion: 0.22
Nodes (14): configurationsService API, getScraperRuns Method, getStats Method, getStatuses Method, runScraper Method, App Component, Configurations Page, ConfirmDialog Component (+6 more)

### Community 19 - "Supermarket Web Interfaces"
Cohesion: 0.5
Nodes (3): IProductDetails, ISupermarketWebConfig, IWebIdentifiers

### Community 20 - "Docker Deployment"
Cohesion: 0.5
Nodes (4): Docker Compose Dev Config, Docker Compose Prod Config, Shelly External Docker Network, Traefik Reverse Proxy Routing

### Community 21 - "Project Documentation"
Cohesion: 0.5
Nodes (4): Functional Design Document, Promotion-Driven Scheduling, Project README, Web README

## Knowledge Gaps
- **62 isolated node(s):** `app`, `DatabaseConfig`, `TimeUnit`, `LogLevel`, `router` (+57 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScraperLogger` connect `Supermarket Scraping Core` to `API Routes`, `Logger Utilities`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `PostgresDiscountController` connect `Discount Controller` to `Supermarket Scraping Core`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `PostgresProductController` connect `Product Controller` to `Supermarket Scraping Core`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `app`, `DatabaseConfig`, `TimeUnit` to the rest of the system?**
  _62 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Supermarket Scraping Core` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Data Models & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._