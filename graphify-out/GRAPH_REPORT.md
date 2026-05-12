# Graph Report - discount-scraper  (2026-05-12)

## Corpus Check
- 43 files · ~24,964 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 567 nodes · 709 edges · 47 communities (25 shown, 22 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eda6d7ea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Vite Config File|Vite Config File]]
- [[_COMMUNITY_DateTime Handler Entry|DateTime Handler Entry]]
- [[_COMMUNITY_Column Filter Type|Column Filter Type]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]

## God Nodes (most connected - your core abstractions)
1. `ScraperLogger` - 29 edges
2. `PostgresDiscountController` - 20 edges
3. `PostgresProductController` - 15 edges
4. `ServerLogger` - 14 edges
5. `PostgresDataManager` - 13 edges
6. `PostgresScheduledRunController` - 12 edges
7. `PostgresScraperRunController` - 12 edges
8. `Discount Scraper - Web Interface` - 11 edges
9. `Functional Design Document` - 11 edges
10. `DiscountScraper` - 10 edges

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

## Communities (47 total, 22 thin omitted)

### Community 0 - "Supermarket Scraping Core"
Cohesion: 0.05
Nodes (24): DirkDepartment, DirkOffer, GRAPHQL_HEADERS, PlusCategory, PlusOffer, PlusPromoItem, PlusPromoResponse, extractProductData() (+16 more)

### Community 1 - "Data Models & Config"
Cohesion: 0.09
Nodes (39): AhClient, Albert Heijn Supermarket DB Config (SQL seed), getSupermarketClient (Factory), getDatabaseConfig, DateTimeHandler.getDateTimeString, Dirk Supermarket DB Config (SQL seed), DirkClient, DiscountModel (+31 more)

### Community 2 - "UI Components"
Cohesion: 0.06
Nodes (35): 5.1 Entity Relationship Diagram, 5.2 Table Specifications, 5.3 Database Indexes Strategy, 5.4 Data Flow Diagram, 5.5 API Data Contracts, 5.6 Configuration Data Structure, 5.7 System Architecture Diagram, 5. Data Structure (+27 more)

### Community 3 - "API Routes"
Cohesion: 0.06
Nodes (32): 3. Access the Application, API Usage, code:properties (DB_NAME=discount), code:json ({), code:bash (# Access database directly), code:bash (# Start services), code:bash (docker compose logs), code:bash (docker compose ps              # Check if postgres is health) (+24 more)

### Community 4 - "Discount Controller"
Cohesion: 0.1
Nodes (13): ConfirmDialogProps, DatabaseTableProps, SearchBarProps, TabType, configurationsService, discountService, ColumnFilter, ConfigurationsStats (+5 more)

### Community 5 - "Logger Utilities"
Cohesion: 0.08
Nodes (25): API Endpoints Used, API Proxy, Browser Support, Build for Production, code:bash (# Navigate to web directory), code:bash (# Start development server), code:bash (# Create production build), code:block4 (web/) (+17 more)

### Community 6 - "Product Controller"
Cohesion: 0.08
Nodes (26): 3.1 User Personas, 3.2 User Stories, 3.3 Use Cases, 3. User Stories & Use Cases, code:mermaid (sequenceDiagram), code:mermaid (sequenceDiagram), code:mermaid (sequenceDiagram), code:mermaid (flowchart TD) (+18 more)

### Community 7 - "Frontend Discount View"
Cohesion: 0.09
Nodes (20): allSupermarkets, dataManager, dbRow, discountController, earliestRun, nameMap, nameToKeyMap, router (+12 more)

### Community 9 - "Data Manager Facade"
Cohesion: 0.11
Nodes (16): Adding a New Supermarket, Architecture, code:bash (cd scraper), code:bash (cd web), code:bash (# Development), code:block4 (DB_NAME=discount), code:block5 (postgres (port 5432) ← scraper-api (port 3001) ← web (port 3), `database/` — PostgreSQL init scripts (+8 more)

### Community 10 - "Scheduled Run Controller"
Cohesion: 0.17
Nodes (8): AhApiClient, AhBonusCategoriesResponse, AhBonusCategory, AhMoney, AhPrice, AhPromotion, AhPromotionLabel, EXCLUDED_CATEGORY_IDS

### Community 13 - "Scheduler Service"
Cohesion: 0.23
Nodes (15): discountService API, getAllDiscounts Method, getDiscountsByFilter Method, Client-Side Filtering Pattern, DatabaseTable Component, DatabaseView Page, Discount Lifecycle (Active/Inactive), DiscountsView Page (+7 more)

### Community 14 - "Plus Supermarket Client"
Cohesion: 0.22
Nodes (14): configurationsService API, getScraperRuns Method, getStats Method, getStatuses Method, runScraper Method, App Component, Configurations Page, ConfirmDialog Component (+6 more)

### Community 18 - "DateTime Handler"
Cohesion: 0.22
Nodes (9): 9.1 API Endpoint Summary, 9.2 Database Query Examples, 9.3 Configuration Example, 9. Appendix, code:sql (SELECT p.name, p.supermarket, d.discount_price, d.expire_dat), code:sql (SELECT), code:sql (SELECT), code:properties (# Database Configuration) (+1 more)

### Community 20 - "Docker Deployment"
Cohesion: 0.25
Nodes (8): 2.1 In Scope, 2.2 Out of Scope (Current Version), 2.3 System Boundaries, 2.4 Technology Stack, 2. Scope, code:mermaid (graph TB), Core Features, Not Implemented

### Community 22 - "Product Model"
Cohesion: 0.29
Nodes (7): 4.1 Core System Requirements, FR-001: Web Scraping Engine, FR-002: Data Storage & Management, FR-003: Scheduling System, FR-004: REST API, FR-005: Web Interface, FR-006: Monitoring & Logging

### Community 23 - "Scraper Run Model"
Cohesion: 0.29
Nodes (7): 4.2 Non-Functional Requirements, NFR-001: Performance, NFR-002: Reliability, NFR-003: Scalability, NFR-004: Maintainability, NFR-005: Usability, NFR-006: Deployment

### Community 24 - "Filter Bar Component"
Cohesion: 0.29
Nodes (6): 7.1 Potential Features, 7.2 Scalability Considerations, 7. Future Enhancements, 8. Glossary, DiscountScraper System, Functional Design Document

### Community 26 - "Product Data Extraction"
Cohesion: 0.33
Nodes (6): 6.1 Component Interaction, 6.2 Deployment Architecture, 6.3 Technology Integration Points, 6. System Integration, code:mermaid (sequenceDiagram), code:mermaid (graph TB)

### Community 27 - "Date Parsing Bridge"
Cohesion: 0.33
Nodes (6): 4.3 System Behavior, 4. Functional Requirements, code:mermaid (stateDiagram-v2), code:mermaid (stateDiagram-v2), Discount Lifecycle, Scraper Run States

### Community 30 - "DateTime Handler Entry"
Cohesion: 0.4
Nodes (5): 1.1 System Purpose, 1.2 Business Goals, 1.3 Target Audience, 1.4 Key Benefits, 1. Purpose

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (3): IProductDetails, ISupermarketWebConfig, IWebIdentifiers

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (4): Functional Design Document, Promotion-Driven Scheduling, Project README, Web README

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (4): Docker Compose Dev Config, Docker Compose Prod Config, Shelly External Docker Network, Traefik Reverse Proxy Routing

## Knowledge Gaps
- **195 isolated node(s):** `app`, `PlusOffer`, `PlusCategory`, `PlusPromoItem`, `PlusPromoResponse` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScraperLogger` connect `Supermarket Scraping Core` to `Scheduled Run Controller`, `Scraper Run Controller`, `Frontend Discount View`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Functional Design Document` connect `Filter Bar Component` to `UI Components`, `Product Controller`, `DateTime Handler`, `Docker Deployment`, `Product Data Extraction`, `Date Parsing Bridge`, `DateTime Handler Entry`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `PostgresDiscountController` connect `Frontend Config & App` to `Supermarket Scraping Core`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `app`, `PlusOffer`, `PlusCategory` to the rest of the system?**
  _195 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Supermarket Scraping Core` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Data Models & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._