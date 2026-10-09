import { Request, Response, Router } from "express";
import { serverLogger } from "../utils/Logger";
import PostgresDataManager from "../data/PostgresDataManager";
import {
  SUPERMARKETS,
  CURRENT_DISCOUNT_JOIN,
  mapSearchRow,
  parseScope,
  parseSupermarkets,
  scopeFilter,
  searchProducts,
  supermarketKey,
} from "./ProductSearch";

/**
 * Public, read-only API for consumer apps (e.g. Baskit).
 *
 * Mounted under /api/public/v1. Only exposes data that is safe for end users:
 * no scraper triggers, run logs or scheduler management. The response shape
 * is camelCase and versioned so the admin API can change independently.
 */
const router = Router();

const dataManager = new PostgresDataManager();

export { SUPERMARKETS };

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function parseIntParam(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function toKey(name: string): string {
  return supermarketKey(name);
}

router.use((req: Request, res: Response, next) => {
  // Discount data only changes when a scraper run completes; a short cache is safe.
  res.set("Cache-Control", "public, max-age=60");
  next();
});

router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// List supermarkets with the number of active discounts per supermarket
router.get("/supermarkets", async (req: Request, res: Response) => {
  try {
    const result = await dataManager.db.query(
      `SELECT p.supermarket,
              COUNT(d.id) AS active_discounts,
              MAX(d.created_at) AS last_updated,
              MIN(d.expire_date) AS expire_date
       FROM products p
       INNER JOIN discounts d ON p.id = d.product_id
       WHERE d.active = true AND d.expire_date > NOW()
       GROUP BY p.supermarket`
    );

    const catalog = await dataManager.db.query(
      `SELECT supermarket, COUNT(*) AS products, MAX(catalog_updated_at) AS updated
       FROM products WHERE in_catalog = true GROUP BY supermarket`
    );

    const supermarkets = SUPERMARKETS.map((sm) => {
      const row = result.rows.find((r: any) => r.supermarket === sm.name);
      const catalogRow = catalog.rows.find((r: any) => r.supermarket === sm.name);
      return {
        key: sm.key,
        name: sm.name,
        activeDiscounts: row ? parseInt(row.active_discounts, 10) : 0,
        lastUpdated: row?.last_updated ?? null,
        expireDate: row?.expire_date ?? null,
        catalogProducts: catalogRow ? parseInt(catalogRow.products, 10) : 0,
        catalogUpdated: catalogRow?.updated ?? null,
      };
    });

    res.status(200).json(supermarkets);
  } catch (error: any) {
    serverLogger.error(`Public API: error fetching supermarkets: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch supermarkets" });
  }
});

// List categories of active discounts, optionally filtered by supermarket
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const supermarkets = parseSupermarkets(req.query.supermarket);
    const scope = parseScope(req.query.scope);
    const params: any[] = [];
    let filter = "";
    if (supermarkets.length > 0) {
      params.push(supermarkets);
      filter = `AND p.supermarket = ANY($${params.length})`;
    }

    const result = await dataManager.db.query(
      `SELECT p.category, COUNT(*) AS count
       FROM products p
       ${CURRENT_DISCOUNT_JOIN}
       WHERE ${scopeFilter(scope)} ${filter}
       GROUP BY p.category
       ORDER BY p.category ASC`,
      params
    );

    res.status(200).json(
      result.rows.map((r: any) => ({ name: r.category, count: parseInt(r.count, 10) }))
    );
  } catch (error: any) {
    serverLogger.error(`Public API: error fetching categories: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * Search products.
 *
 * Query params:
 *   q            free text; every word must appear in the product name (case-insensitive)
 *   supermarket  comma separated supermarket keys (see /supermarkets)
 *   category     exact category name
 *   scope        offers (default): only products on offer; all: also catalog products
 *   sort         relevance (default) | price | discount | expiry | name
 *   limit        page size, 1..100 (default 25)
 *   offset       page offset (default 0)
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const limit = parseIntParam(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseIntParam(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const category = String(req.query.category ?? "").trim();

    const { total, rows } = await searchProducts(dataManager.db, {
      q,
      supermarkets: parseSupermarkets(req.query.supermarket),
      category: category || undefined,
      sort: String(req.query.sort ?? "relevance"),
      scope: parseScope(req.query.scope),
      limit,
      offset,
    });

    res.status(200).json({ query: q, total, limit, offset, items: rows.map(mapSearchRow) });
  } catch (error: any) {
    serverLogger.error(`Public API: error searching products: ${error.message}`);
    res.status(500).json({ error: "Failed to search products" });
  }
});

// Single product with its current discount and discount history
router.get("/products/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }

  try {
    const productResult = await dataManager.db.query(
      `SELECT id, name, category, supermarket, product_url, updated_at,
              brand, unit_size, image_url, regular_price, unit_price, in_catalog
       FROM products WHERE id = $1`,
      [id]
    );
    if (productResult.rows.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const product = productResult.rows[0];

    const discountsResult = await dataManager.db.query(
      `SELECT id, original_price, discount_price, unit_price, special_discount,
              expire_date, active, created_at
       FROM discounts WHERE product_id = $1
       ORDER BY expire_date DESC, created_at DESC
       LIMIT 50`,
      [id]
    );

    const history = discountsResult.rows.map((d: any) => ({
      id: d.id,
      originalPrice: parseFloat(d.original_price) > 0 ? parseFloat(d.original_price) : null,
      discountPrice: parseFloat(d.discount_price),
      unitPrice: d.unit_price ?? null,
      specialDiscount: d.special_discount || null,
      expireDate: d.expire_date,
      active: d.active && new Date(d.expire_date) > new Date(),
      createdAt: d.created_at,
    }));

    const pricesResult = await dataManager.db.query(
      `SELECT price, recorded_at FROM price_history
       WHERE product_id = $1 ORDER BY recorded_at DESC LIMIT 100`,
      [id]
    );

    const currentDiscount = history.find((d) => d.active) ?? null;
    const regularPrice =
      product.regular_price === null ? null : parseFloat(product.regular_price);

    res.status(200).json({
      id: product.id,
      name: product.name,
      category: product.category,
      supermarket: { key: toKey(product.supermarket), name: product.supermarket },
      productUrl: product.product_url ?? null,
      updatedAt: product.updated_at,
      price: currentDiscount?.discountPrice ?? regularPrice,
      catalog: product.in_catalog
        ? {
            regularPrice,
            unitPrice: product.unit_price ?? null,
            unitSize: product.unit_size ?? null,
            brand: product.brand ?? null,
            imageUrl: product.image_url ?? null,
          }
        : null,
      currentDiscount,
      history,
      priceHistory: pricesResult.rows.map((r: any) => ({
        price: parseFloat(r.price),
        recordedAt: r.recorded_at,
      })),
    });
  } catch (error: any) {
    serverLogger.error(`Public API: error fetching product ${id}: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

export default router;
