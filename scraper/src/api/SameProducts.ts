import PostgresDataContext from "../data/PostgresDataContext";
import { isSameProduct, MatchCandidate, namingHabits } from "../utils/ProductMatch";
import { CURRENT_DISCOUNT_JOIN, PRODUCT_COLUMNS, rowQuantity, scopeFilter } from "./ProductSearch";

/**
 * The same product at the other supermarkets (see utils/ProductMatch): per
 * supermarket the cheapest product that is the same as `product`, by barcode
 * or by brand, quantity and name words. Only products with a current price.
 */

// Products of one brand that are read to learn each supermarket's naming habits.
const MAX_BRAND_ROWS = 5000;
const QUANTITY_TOLERANCE = 0.02;

const toCandidate = (row: any): MatchCandidate => ({
  supermarket: row.supermarket,
  ean: row.ean ?? null,
  matchBrand: row.match_brand ?? null,
  matchTokens: row.match_tokens ?? null,
  quantity: rowQuantity(row),
});

const currentPrice = (row: any): number =>
  parseFloat(row.discount_price ?? row.regular_price ?? "Infinity");

/** Rows (PRODUCT_COLUMNS) of the same product at other supermarkets, cheapest per supermarket. */
export async function findSameProducts(
  db: PostgresDataContext,
  product: any,
  supermarkets?: string[]
): Promise<any[]> {
  const own = toCandidate(product);
  if (!own.ean && (!own.matchBrand || !own.quantity)) return [];

  const value = own.quantity?.value ?? 0;
  const params: any[] = [
    product.supermarket,
    own.ean,
    own.matchBrand,
    own.quantity?.unit ?? null,
    value * (1 - QUANTITY_TOLERANCE),
    value * (1 + QUANTITY_TOLERANCE),
  ];
  let supermarketFilter = "";
  if (supermarkets && supermarkets.length > 0) {
    params.push(supermarkets);
    supermarketFilter = `AND p.supermarket = ANY($${params.length})`;
  }

  const candidates = await db.query(
    `SELECT ${PRODUCT_COLUMNS}
     FROM products p
     ${CURRENT_DISCOUNT_JOIN}
     WHERE p.supermarket <> $1 ${supermarketFilter}
       AND ${scopeFilter("all")}
       AND COALESCE(d.discount_price, p.regular_price) IS NOT NULL
       AND ((p.ean = $2 AND $2::text IS NOT NULL)
         OR (p.match_brand = $3 AND p.quantity_unit = $4 AND p.quantity_value BETWEEN $5 AND $6))`,
    params
  );
  if (candidates.rows.length === 0) return [];

  // Naming habits need all of the brand's names per supermarket, not only this pack size.
  const brandRows = own.matchBrand
    ? await db.query<{ supermarket: string; match_tokens: string | null }>(
        "SELECT supermarket, match_tokens FROM products WHERE match_brand = $1 LIMIT $2",
        [own.matchBrand, MAX_BRAND_ROWS]
      )
    : { rows: [] as { supermarket: string; match_tokens: string | null }[] };
  const habits = namingHabits(
    brandRows.rows.map((r) => ({ supermarket: r.supermarket, matchTokens: r.match_tokens }))
  );

  const best = new Map<string, any>();
  for (const row of candidates.rows) {
    if (!isSameProduct(own, toCandidate(row), habits)) continue;
    const current = best.get(row.supermarket);
    if (!current || currentPrice(row) < currentPrice(current)) best.set(row.supermarket, row);
  }
  return [...best.values()].sort((a, b) => currentPrice(a) - currentPrice(b));
}
