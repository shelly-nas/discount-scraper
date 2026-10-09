import { Request, Response, Router } from "express";
import { serverLogger } from "../utils/Logger";
import PostgresDataManager from "../data/PostgresDataManager";

/**
 * Public, read-only API for consumer apps (e.g. Baskit).
 *
 * Mounted under /api/public/v1. Only exposes data that is safe for end users:
 * no scraper triggers, run logs or scheduler management. The response shape
 * is camelCase and versioned so the admin API can change independently.
 */
const router = Router();

const dataManager = new PostgresDataManager();

export const SUPERMARKETS: { key: string; name: string }[] = [
  { key: "albert-heijn", name: "Albert Heijn" },
  { key: "aldi", name: "Aldi" },
  { key: "dirk", name: "Dirk" },
  { key: "hoogvliet", name: "Hoogvliet" },
  { key: "jumbo", name: "Jumbo" },
  { key: "lidl", name: "Lidl" },
  { key: "plus", name: "PLUS" },
];

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_QUERY_TOKENS = 8;

const SORTS: { [key: string]: string } = {
  relevance: "relevance DESC, d.discount_price ASC, p.name ASC",
  price: "d.discount_price ASC, p.name ASC",
  discount: "discount_percentage DESC NULLS LAST, p.name ASC",
  expiry: "d.expire_date ASC, p.name ASC",
  name: "p.name ASC",
};

function toKey(name: string): string {
  return SUPERMARKETS.find((s) => s.name === name)?.key ?? name;
}

function parseIntParam(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

/** Accepts `?supermarket=dirk,aldi` or repeated `?supermarket=dirk&supermarket=aldi`. */
function parseSupermarkets(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
    .map((key) => SUPERMARKETS.find((s) => s.key === key)?.name)
    .filter((name): name is string => !!name);
}

/** Escapes LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function mapItem(row: any) {
  const originalPrice = parseFloat(row.original_price);
  const discountPrice = parseFloat(row.discount_price);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supermarket: {
      key: toKey(row.supermarket),
      name: row.supermarket,
    },
    productUrl: row.product_url ?? null,
    discount: {
      id: row.discount_id,
      originalPrice: originalPrice > 0 ? originalPrice : null,
      discountPrice,
      unitPrice: row.unit_price ?? null,
      specialDiscount: row.special_discount || null,
      discountPercentage:
        row.discount_percentage !== null && row.discount_percentage !== undefined
          ? parseFloat(row.discount_percentage)
          : null,
      expireDate: row.expire_date,
    },
    updatedAt: row.updated_at,
  };
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

    const supermarkets = SUPERMARKETS.map((sm) => {
      const row = result.rows.find((r: any) => r.supermarket === sm.name);
      return {
        key: sm.key,
        name: sm.name,
        activeDiscounts: row ? parseInt(row.active_discounts, 10) : 0,
        lastUpdated: row?.last_updated ?? null,
        expireDate: row?.expire_date ?? null,
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
    const params: any[] = [];
    let filter = "";
    if (supermarkets.length > 0) {
      params.push(supermarkets);
      filter = `AND p.supermarket = ANY($${params.length})`;
    }

    const result = await dataManager.db.query(
      `SELECT p.category, COUNT(*) AS count
       FROM products p
       INNER JOIN discounts d ON p.id = d.product_id
       WHERE d.active = true AND d.expire_date > NOW() ${filter}
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
 * Search active discounts.
 *
 * Query params:
 *   q            free text; every word must appear in the product name (case-insensitive)
 *   supermarket  comma separated supermarket keys (see /supermarkets)
 *   category     exact category name
 *   sort         relevance (default) | price | discount | expiry | name
 *   limit        page size, 1..100 (default 25)
 *   offset       page offset (default 0)
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const supermarkets = parseSupermarkets(req.query.supermarket);
    const category = String(req.query.category ?? "").trim();
    const sortKey = String(req.query.sort ?? "relevance");
    const limit = parseIntParam(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = parseIntParam(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

    const params: any[] = [];
    const where: string[] = ["d.active = true", "d.expire_date > NOW()"];

    const tokens = q
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .slice(0, MAX_QUERY_TOKENS);
    for (const token of tokens) {
      params.push(`%${escapeLike(token)}%`);
      where.push(`p.name ILIKE $${params.length}`);
    }

    if (supermarkets.length > 0) {
      params.push(supermarkets);
      where.push(`p.supermarket = ANY($${params.length})`);
    }

    if (category) {
      params.push(category);
      where.push(`p.category = $${params.length}`);
    }

    const filterParams = [...params];

    // Relevance: exact name match > name starts with query > word starts with query > contains
    let relevance = "0";
    if (q) {
      params.push(q.toLowerCase());
      const exact = `$${params.length}`;
      params.push(`${escapeLike(q.toLowerCase())}%`);
      const prefix = `$${params.length}`;
      params.push(`% ${escapeLike(q.toLowerCase())}%`);
      const wordPrefix = `$${params.length}`;
      relevance = `(CASE
          WHEN LOWER(p.name) = ${exact} THEN 3
          WHEN LOWER(p.name) LIKE ${prefix} THEN 2
          WHEN LOWER(p.name) LIKE ${wordPrefix} THEN 1
          ELSE 0 END)`;
    }

    const orderBy = SORTS[sortKey] ?? SORTS.relevance;
    const whereSql = where.join(" AND ");

    const countResult = await dataManager.db.query(
      `SELECT COUNT(*) AS total
       FROM products p
       INNER JOIN discounts d ON p.id = d.product_id
       WHERE ${whereSql}`,
      filterParams
    );

    params.push(limit);
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const result = await dataManager.db.query(
      `SELECT p.id, p.name, p.category, p.supermarket, p.product_url, p.updated_at,
              d.id AS discount_id, d.original_price, d.discount_price, d.unit_price,
              d.special_discount, d.expire_date,
              CASE WHEN d.original_price > 0 AND d.original_price > d.discount_price
                   THEN ROUND((1 - d.discount_price / d.original_price) * 100)
                   ELSE NULL END AS discount_percentage,
              ${relevance} AS relevance
       FROM products p
       INNER JOIN discounts d ON p.id = d.product_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    res.status(200).json({
      query: q,
      total: parseInt(countResult.rows[0].total, 10),
      limit,
      offset,
      items: result.rows.map(mapItem),
    });
  } catch (error: any) {
    serverLogger.error(`Public API: error searching discounts: ${error.message}`);
    res.status(500).json({ error: "Failed to search discounts" });
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
      `SELECT id, name, category, supermarket, product_url, updated_at
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

    res.status(200).json({
      id: product.id,
      name: product.name,
      category: product.category,
      supermarket: { key: toKey(product.supermarket), name: product.supermarket },
      productUrl: product.product_url ?? null,
      updatedAt: product.updated_at,
      currentDiscount: history.find((d) => d.active) ?? null,
      history,
    });
  } catch (error: any) {
    serverLogger.error(`Public API: error fetching product ${id}: ${error.message}`);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

export default router;
