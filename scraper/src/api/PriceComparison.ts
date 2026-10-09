import PostgresDataContext from "../data/PostgresDataContext";
import {
  CURRENT_DISCOUNT_JOIN,
  SUPERMARKETS,
  mapSearchRow,
  scopeFilter,
  supermarketKey,
} from "./ProductSearch";

/**
 * Prices a shopping list at every supermarket.
 *
 * For each list item and supermarket the best matching product is picked:
 * every word of the item must be in the product name, the most relevant name
 * wins and among equally relevant names the cheapest current price (offer or
 * regular catalog price). When nothing matches, size tokens such as "1L" or
 * "500g" are dropped and the match is retried.
 */

export interface CompareItem {
  id: string;
  query: string;
  /** How many of this item; multiplies the price. */
  count: number;
  /** Product the item was added from; used as is at its own supermarket. */
  productId?: number;
}

export const MAX_COMPARE_ITEMS = 100;
const MAX_QUERY_TOKENS = 8;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((t) => t.length > 0)
    .slice(0, MAX_QUERY_TOKENS);
}

const SELECT_COLUMNS = `
  p.id, p.name, p.category, p.supermarket, p.product_url, p.updated_at,
  p.brand, p.unit_size, p.image_url, p.regular_price,
  p.unit_price AS catalog_unit_price, p.in_catalog,
  d.id AS discount_id, d.original_price, d.discount_price, d.unit_price,
  d.special_discount, d.expire_date,
  CASE WHEN d.original_price > 0 AND d.original_price > d.discount_price
       THEN ROUND((1 - d.discount_price / d.original_price) * 100)
       ELSE NULL END AS discount_percentage`;

/** Best match per supermarket for one set of tokens. */
async function bestMatches(
  db: PostgresDataContext,
  tokens: string[],
  supermarkets: string[]
): Promise<any[]> {
  if (tokens.length === 0) return [];
  const params: any[] = [supermarkets];
  const where = [
    scopeFilter("all"),
    "COALESCE(d.discount_price, p.regular_price) IS NOT NULL",
    "p.supermarket = ANY($1)",
  ];
  for (const token of tokens) {
    params.push(`%${escapeLike(token)}%`);
    where.push(`p.name ILIKE $${params.length}`);
  }
  // Ranking: how many tokens match as whole words ("melk" prefers "Halfvolle
  // melk" to "Melkchocolade"), then the cheapest, then the shortest name.
  const wordMatches = tokens.map((token) => {
    params.push(`\\m${escapeRegex(token)}\\M`);
    return `(CASE WHEN p.name ~* $${params.length} THEN 1 ELSE 0 END)`;
  });

  const wordScore = `(${wordMatches.join(" + ")})`;
  // At least one word must match as a whole word: a substring alone ("melk"
  // in "Melkchocolade") is a different product.
  where.push(`${wordScore} >= 1`);

  const result = await db.query(
    `SELECT DISTINCT ON (p.supermarket) ${SELECT_COLUMNS}
     FROM products p
     ${CURRENT_DISCOUNT_JOIN}
     WHERE ${where.join(" AND ")}
     ORDER BY p.supermarket,
              ${wordScore} DESC,
              COALESCE(d.discount_price, p.regular_price) ASC,
              LENGTH(p.name) ASC`,
    params
  );
  return result.rows;
}

async function productById(db: PostgresDataContext, id: number): Promise<any | null> {
  const result = await db.query(
    `SELECT ${SELECT_COLUMNS}
     FROM products p
     ${CURRENT_DISCOUNT_JOIN}
     WHERE p.id = $1 AND COALESCE(d.discount_price, p.regular_price) IS NOT NULL`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function compareList(
  db: PostgresDataContext,
  items: CompareItem[],
  supermarketNames: string[]
) {
  const names = supermarketNames.length > 0 ? supermarketNames : SUPERMARKETS.map((s) => s.name);

  // matches[itemIndex][supermarketName] = row
  const matches: Map<string, any>[] = [];
  for (const item of items) {
    const perSupermarket = new Map<string, any>();

    if (item.productId !== undefined) {
      const own = await productById(db, item.productId);
      if (own && names.includes(own.supermarket)) perSupermarket.set(own.supermarket, own);
    }

    const remaining = names.filter((n) => !perSupermarket.has(n));
    const tokens = tokenize(item.query);
    for (const row of await bestMatches(db, tokens, remaining)) {
      perSupermarket.set(row.supermarket, row);
    }

    // Retry without size tokens ("1L", "500g", "6x1,5L") where nothing matched.
    const unmatched = names.filter((n) => !perSupermarket.has(n));
    const withoutSizes = tokens.filter((t) => !/\d/.test(t));
    if (unmatched.length > 0 && withoutSizes.length > 0 && withoutSizes.length < tokens.length) {
      for (const row of await bestMatches(db, withoutSizes, unmatched)) {
        perSupermarket.set(row.supermarket, row);
      }
    }

    matches.push(perSupermarket);
  }

  const supermarkets = names.map((name) => {
    let total = 0;
    const lines = items.map((item, index) => {
      const row = matches[index].get(name);
      if (!row) return { itemId: item.id, count: item.count, product: null, lineTotal: null };
      const product = mapSearchRow(row);
      const lineTotal = Math.round((product.price ?? 0) * item.count * 100) / 100;
      total += lineTotal;
      return { itemId: item.id, count: item.count, product, lineTotal };
    });
    const matched = lines.filter((l) => l.product !== null).length;
    return {
      key: supermarketKey(name),
      name,
      total: Math.round(total * 100) / 100,
      matched,
      missing: lines.filter((l) => l.product === null).map((l) => l.itemId),
      lines,
    };
  });

  // Most items found first; among those the cheapest. Supermarkets without
  // any match go last.
  supermarkets.sort((a, b) => b.matched - a.matched || a.total - b.total);

  return { itemCount: items.length, supermarkets };
}
