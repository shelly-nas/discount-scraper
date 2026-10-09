import PostgresDataContext from "../data/PostgresDataContext";

/**
 * Product search shared by the public API endpoints.
 *
 * Every product gets at most one current discount (the cheapest active,
 * non-expired one). scope "offers" only returns products with such a discount;
 * scope "all" also returns catalog products at their regular price.
 */

export const SUPERMARKETS: { key: string; name: string }[] = [
  { key: "albert-heijn", name: "Albert Heijn" },
  { key: "aldi", name: "Aldi" },
  { key: "dirk", name: "Dirk" },
  { key: "hoogvliet", name: "Hoogvliet" },
  { key: "jumbo", name: "Jumbo" },
  { key: "lidl", name: "Lidl" },
  { key: "plus", name: "PLUS" },
];

export type SearchScope = "offers" | "all";

export interface SearchOptions {
  q: string;
  /** Supermarket display names (not keys). */
  supermarkets: string[];
  category?: string;
  sort: string;
  scope: SearchScope;
  limit: number;
  offset: number;
}

const MAX_QUERY_TOKENS = 8;

// Effective price: the offer price when on offer, otherwise the regular price.
const EFFECTIVE_PRICE = "COALESCE(d.discount_price, p.regular_price)";

const SORTS: { [key: string]: string } = {
  relevance: `relevance DESC, ${EFFECTIVE_PRICE} ASC NULLS LAST, p.name ASC`,
  price: `${EFFECTIVE_PRICE} ASC NULLS LAST, p.name ASC`,
  discount: "discount_percentage DESC NULLS LAST, p.name ASC",
  expiry: "d.expire_date ASC NULLS LAST, p.name ASC",
  name: "p.name ASC",
};

export function supermarketKey(name: string): string {
  return SUPERMARKETS.find((s) => s.name === name)?.key ?? name;
}

/** Accepts `dirk,aldi` or repeated values; returns display names of known keys. */
export function parseSupermarkets(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
    .map((key) => SUPERMARKETS.find((s) => s.key === key)?.name)
    .filter((name): name is string => !!name);
}

export function parseScope(value: unknown): SearchScope {
  return String(value ?? "") === "all" ? "all" : "offers";
}

/** Escapes LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Escapes regex metacharacters so user input is matched literally. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The cheapest current discount per product, joined as `d`. */
export const CURRENT_DISCOUNT_JOIN = `
  LEFT JOIN LATERAL (
    SELECT id, original_price, discount_price, unit_price, special_discount, expire_date
    FROM discounts
    WHERE product_id = p.id AND active = true AND expire_date > NOW()
    ORDER BY discount_price ASC
    LIMIT 1
  ) d ON true`;

export function scopeFilter(scope: SearchScope): string {
  return scope === "all" ? "(p.in_catalog = true OR d.id IS NOT NULL)" : "d.id IS NOT NULL";
}

export async function searchProducts(
  db: PostgresDataContext,
  options: SearchOptions
): Promise<{ total: number; rows: any[] }> {
  const params: any[] = [];
  const where: string[] = [scopeFilter(options.scope)];
  const q = options.q.trim();

  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .slice(0, MAX_QUERY_TOKENS);
  for (const token of tokens) {
    params.push(`%${escapeLike(token)}%`);
    where.push(`p.name ILIKE $${params.length}`);
  }

  if (options.supermarkets.length > 0) {
    params.push(options.supermarkets);
    where.push(`p.supermarket = ANY($${params.length})`);
  }

  if (options.category) {
    params.push(options.category);
    where.push(`p.category = $${params.length}`);
  }

  const whereSql = where.join(" AND ");
  const filterParams = [...params];

  // Relevance: exact name > whole word > name starts with query > word starts with query > contains
  let relevance = "0";
  if (q) {
    const lower = q.toLowerCase();
    params.push(lower);
    const exact = `$${params.length}`;
    params.push(`\\m${escapeRegex(lower)}\\M`);
    const wholeWord = `$${params.length}`;
    params.push(`${escapeLike(lower)}%`);
    const prefix = `$${params.length}`;
    params.push(`% ${escapeLike(lower)}%`);
    const wordPrefix = `$${params.length}`;
    relevance = `(CASE
        WHEN LOWER(p.name) = ${exact} THEN 4
        WHEN p.name ~* ${wholeWord} THEN 3
        WHEN LOWER(p.name) LIKE ${prefix} THEN 2
        WHEN LOWER(p.name) LIKE ${wordPrefix} THEN 1
        ELSE 0 END)`;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM products p ${CURRENT_DISCOUNT_JOIN} WHERE ${whereSql}`,
    filterParams
  );

  params.push(options.limit);
  const limitParam = `$${params.length}`;
  params.push(options.offset);
  const offsetParam = `$${params.length}`;

  const result = await db.query(
    `SELECT p.id, p.name, p.category, p.supermarket, p.product_url, p.updated_at,
            p.brand, p.unit_size, p.image_url, p.regular_price,
            p.unit_price AS catalog_unit_price, p.in_catalog,
            d.id AS discount_id, d.original_price, d.discount_price, d.unit_price,
            d.special_discount, d.expire_date,
            CASE WHEN d.original_price > 0 AND d.original_price > d.discount_price
                 THEN ROUND((1 - d.discount_price / d.original_price) * 100)
                 ELSE NULL END AS discount_percentage,
            ${relevance} AS relevance
     FROM products p
     ${CURRENT_DISCOUNT_JOIN}
     WHERE ${whereSql}
     ORDER BY ${SORTS[options.sort] ?? SORTS.relevance}
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  return { total: parseInt(countResult.rows[0].total, 10), rows: result.rows };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? null : parsed;
}

/** Maps a search row to the public API item shape. */
export function mapSearchRow(row: any) {
  const originalPrice = toNumber(row.original_price);
  const discountPrice = toNumber(row.discount_price);
  const regularPrice = toNumber(row.regular_price);

  const discount =
    row.discount_id === null || row.discount_id === undefined
      ? null
      : {
          id: row.discount_id,
          originalPrice: originalPrice !== null && originalPrice > 0 ? originalPrice : regularPrice,
          discountPrice,
          unitPrice: row.unit_price ?? null,
          specialDiscount: row.special_discount || null,
          discountPercentage: toNumber(row.discount_percentage),
          expireDate: row.expire_date,
        };

  const catalog = row.in_catalog
    ? {
        regularPrice,
        unitPrice: row.catalog_unit_price ?? null,
        unitSize: row.unit_size ?? null,
        brand: row.brand ?? null,
        imageUrl: row.image_url ?? null,
      }
    : null;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    supermarket: { key: supermarketKey(row.supermarket), name: row.supermarket },
    productUrl: row.product_url ?? null,
    /** What the product costs right now: the offer price, else the regular price. */
    price: discount?.discountPrice ?? regularPrice,
    discount,
    catalog,
    updatedAt: row.updated_at,
  };
}
