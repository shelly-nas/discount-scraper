import { PoolClient } from "pg";
import PostgresDataContext from "../data/PostgresDataContext";
import { ICatalogProduct } from "../interfaces/ICatalogProduct";
import { scraperLogger } from "../utils/Logger";

export interface CatalogBatchMetrics {
  created: number;
  updated: number;
  pricesChanged: number;
}

export interface CatalogRunRow {
  id: number;
  supermarket: string;
  status: string;
  products_seen: number;
  products_created: number;
  products_updated: number;
  prices_changed: number;
  products_removed: number;
  error_message: string | null;
  started_at: Date;
  completed_at: Date | null;
  duration_seconds: number | null;
}

/** Stores catalog products (regular prices) and catalog run bookkeeping. */
class PostgresCatalogController {
  private db: PostgresDataContext;

  constructor(db: PostgresDataContext) {
    this.db = db;
  }

  /**
   * Upserts one page of catalog products in a single transaction.
   *
   * A product is matched on (supermarket, external_id) first, then on
   * (supermarket, name) so an existing offer-only row is upgraded instead of
   * duplicated. Price history only gets a row when the regular price changes.
   */
  async upsertBatch(
    supermarket: string,
    products: ICatalogProduct[],
    runStartedAt: Date
  ): Promise<CatalogBatchMetrics> {
    const metrics: CatalogBatchMetrics = { created: 0, updated: 0, pricesChanged: 0 };

    await this.db.transaction(async (client) => {
      for (const product of products) {
        const result = await this.upsertOne(client, supermarket, product, runStartedAt);
        if (result === "skipped") continue;
        if (result.created) metrics.created++;
        else metrics.updated++;
        if (result.priceChanged) metrics.pricesChanged++;
      }
    });

    return metrics;
  }

  private async upsertOne(
    client: PoolClient,
    supermarket: string,
    product: ICatalogProduct,
    runStartedAt: Date
  ): Promise<{ created: boolean; priceChanged: boolean } | "skipped"> {
    // Already seen in this run (product listed in several categories).
    const byExternal = await client.query<{ id: number; regular_price: string | null; catalog_updated_at: Date | null }>(
      `SELECT id, regular_price, catalog_updated_at FROM products
       WHERE supermarket = $1 AND external_id = $2`,
      [supermarket, product.externalId]
    );
    let existing = byExternal.rows[0];
    if (existing?.catalog_updated_at && existing.catalog_updated_at >= runStartedAt) {
      return "skipped";
    }

    let name = product.name;
    if (!existing) {
      const byName = await client.query<{ id: number; regular_price: string | null; external_id: string | null }>(
        `SELECT id, regular_price, external_id FROM products WHERE supermarket = $1 AND name = $2`,
        [supermarket, name]
      );
      const sameName = byName.rows[0];
      if (sameName && sameName.external_id === null) {
        existing = { id: sameName.id, regular_price: sameName.regular_price, catalog_updated_at: null };
      } else if (sameName) {
        // Two different products with the same title: make the name unique.
        name = await this.uniqueName(client, supermarket, product);
      }
    }

    const values = [
      product.externalId,
      product.brand,
      product.unitSize,
      product.imageUrl,
      product.price,
      product.unitPrice,
      product.productUrl,
    ];

    if (existing) {
      await client.query(
        `UPDATE products SET
           external_id = $2, brand = $3, unit_size = $4, image_url = $5,
           regular_price = $6, unit_price = $7,
           product_url = COALESCE($8, product_url),
           category = $9, in_catalog = true, catalog_updated_at = NOW()
         WHERE id = $1`,
        [existing.id, ...values, product.category]
      );
      const previous = existing.regular_price === null ? null : parseFloat(existing.regular_price);
      // A first price (offer-only product joining the catalog) is recorded but
      // is not a change.
      if (previous === null || Math.abs(previous - product.price) >= 0.005) {
        await this.recordPrice(client, existing.id, product.price);
      }
      return { created: false, priceChanged: previous !== null && Math.abs(previous - product.price) >= 0.005 };
    }

    const inserted = await client.query<{ id: number }>(
      `INSERT INTO products
         (name, category, supermarket, external_id, brand, unit_size, image_url,
          regular_price, unit_price, product_url, in_catalog, catalog_updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())
       RETURNING id`,
      [name, product.category, supermarket, ...values]
    );
    await this.recordPrice(client, inserted.rows[0].id, product.price);
    return { created: true, priceChanged: false };
  }

  private async uniqueName(
    client: PoolClient,
    supermarket: string,
    product: ICatalogProduct
  ): Promise<string> {
    const candidates = [
      product.unitSize ? `${product.name} ${product.unitSize}` : null,
      `${product.name} (${product.externalId})`,
    ].filter((c): c is string => c !== null);
    for (const candidate of candidates) {
      const taken = await client.query(
        "SELECT 1 FROM products WHERE supermarket = $1 AND name = $2",
        [supermarket, candidate]
      );
      if (taken.rows.length === 0) return candidate;
    }
    return `${product.name} (${product.externalId})`;
  }

  private async recordPrice(client: PoolClient, productId: number, price: number): Promise<void> {
    await client.query("INSERT INTO price_history (product_id, price) VALUES ($1, $2)", [
      productId,
      price,
    ]);
  }

  /**
   * Marks products that were not seen in this run as no longer in the
   * catalog. Skipped when the run saw suspiciously few products, so a partial
   * API outage cannot empty the catalog.
   */
  async markRemoved(supermarket: string, runStartedAt: Date, productsSeen: number): Promise<number> {
    const current = await this.db.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM products WHERE supermarket = $1 AND in_catalog = true",
      [supermarket]
    );
    const previousCount = parseInt(current.rows[0].count, 10);
    if (productsSeen < previousCount * 0.5) {
      scraperLogger.warn(
        `${supermarket} catalog: saw ${productsSeen} of ${previousCount} known products, not marking any as removed`
      );
      return 0;
    }
    const result = await this.db.query(
      `UPDATE products SET in_catalog = false
       WHERE supermarket = $1 AND in_catalog = true
         AND (catalog_updated_at IS NULL OR catalog_updated_at < $2)`,
      [supermarket, runStartedAt]
    );
    return result.rowCount ?? 0;
  }

  async createRun(supermarket: string): Promise<{ id: number; startedAt: Date }> {
    const result = await this.db.query<{ id: number; started_at: Date }>(
      `INSERT INTO catalog_runs (supermarket, status) VALUES ($1, 'running')
       RETURNING id, started_at`,
      [supermarket]
    );
    return { id: result.rows[0].id, startedAt: result.rows[0].started_at };
  }

  async completeRun(
    id: number,
    metrics: { seen: number; created: number; updated: number; pricesChanged: number; removed: number }
  ): Promise<void> {
    await this.db.query(
      `UPDATE catalog_runs SET status = 'success', products_seen = $2,
         products_created = $3, products_updated = $4, prices_changed = $5,
         products_removed = $6, completed_at = NOW(),
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::int
       WHERE id = $1`,
      [id, metrics.seen, metrics.created, metrics.updated, metrics.pricesChanged, metrics.removed]
    );
  }

  async failRun(id: number, message: string, seen: number): Promise<void> {
    await this.db.query(
      `UPDATE catalog_runs SET status = 'failed', error_message = $2,
         products_seen = $3, completed_at = NOW(),
         duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::int
       WHERE id = $1`,
      [id, message, seen]
    );
  }

  /** Runs left 'running' by a crash or restart are closed as failed on startup. */
  async failStaleRuns(): Promise<number> {
    const result = await this.db.query(
      `UPDATE catalog_runs SET status = 'failed', completed_at = NOW(),
         error_message = 'Interrupted (server restarted)'
       WHERE status = 'running'`
    );
    return result.rowCount ?? 0;
  }

  async getRuns(limit: number): Promise<CatalogRunRow[]> {
    const result = await this.db.query<CatalogRunRow>(
      "SELECT * FROM catalog_runs ORDER BY started_at DESC LIMIT $1",
      [limit]
    );
    return result.rows;
  }
}

export default PostgresCatalogController;
