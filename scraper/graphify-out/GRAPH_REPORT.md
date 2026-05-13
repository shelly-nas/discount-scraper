# Graph Report - scraper  (2026-05-13)

## Corpus Check
- 46 files · ~17,779 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 308 nodes · 392 edges · 39 communities (25 shown, 14 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b76bf59f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `ScraperLogger` - 27 edges
2. `PostgresDiscountController` - 20 edges
3. `PostgresProductController` - 15 edges
4. `ServerLogger` - 14 edges
5. `PostgresDataManager` - 13 edges
6. `PostgresScheduledRunController` - 12 edges
7. `PostgresScraperRunController` - 12 edges
8. `JumboApiClient` - 9 edges
9. `AhApiClient` - 8 edges
10. `LidlApiClient` - 8 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (39 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (14): DatabaseConfig, getDatabaseConfig(), DiscountRow, ScheduledRunRow, ScraperRunRow, DatabaseConfig, DiscountModel, ProductModel (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (18): allSupermarkets, base, dataManager, dbRow, discountController, earliestRun, nameMap, nameToKeyMap (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (8): AhApiClient, AhBonusCategoriesResponse, AhBonusCategory, AhMoney, AhPrice, AhPromotion, AhPromotionLabel, EXCLUDED_CATEGORY_IDS

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (4): DirkApiClient, DirkDepartment, DirkOffer, GRAPHQL_HEADERS

### Community 8 - "Community 8"
Cohesion: 0.26
Nodes (3): DUTCH_MONTHS, JumboApiClient, RawCard

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (5): PlusApiClient, PlusCategory, PlusOffer, PlusPromoItem, PlusPromoResponse

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (4): AldiAlgoliaDataMap, AldiApiClient, AldiCurrentPrice, AldiProduct

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): allProducts, data, items, link, trackClickMatches, url

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (5): bigUrl, categoryMatches, link, nameMatches, trackMatches

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (4): el, items, link, url

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (4): link, match, priceMatch, strikethroughMatch

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (3): link, parsed, trackData

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (3): ajaxResponses, link, url

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (3): expiryMatches, link, priceMatches

## Knowledge Gaps
- **79 isolated node(s):** `link`, `items`, `link`, `el`, `url` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ScraperLogger` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 8`, `Community 11`, `Community 12`, `Community 13`, `Community 18`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `PostgresDiscountController` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `PostgresProductController` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `link`, `items`, `link` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._