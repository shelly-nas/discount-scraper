import { Quantity, stripQuantity } from "./Quantity";

/**
 * Recognises the same product at different supermarkets.
 *
 * Few supermarkets publish barcodes, so a product is described by its brand,
 * its quantity and the words of its name without pack size and packaging
 * words ("Chocomel Vol 1 L" -> brand "chocomel", words "vol"). Two products
 * are the same when their barcodes are equal, or when brand, quantity and
 * words are equal. Words a supermarket puts in (nearly) every name of a brand
 * ("Chocomel Chocolademelk vol" at Dirk) do not count for that supermarket.
 */

export interface MatchFields {
  matchBrand: string | null;
  matchTokens: string;
}

export interface MatchCandidate {
  supermarket: string;
  ean: string | null;
  matchBrand: string | null;
  matchTokens: string | null;
  quantity: Quantity | null;
}

// Packaging and filler words that say nothing about which product it is.
const FILLER = new Set([
  "de", "het", "een", "en", "met", "van", "voor", "per", "of", "x",
  "pak", "pakje", "pack", "fles", "flessen", "blik", "blikken", "pot", "potje",
  "zak", "zakje", "doos", "tray", "krat", "bus", "beker", "bak", "bakje", "tube",
  "multipack", "voordeelpak", "voordeel", "voordeelverpakking", "megapack", "stuk", "stuks",
]);

// A word must be in this share of a supermarket's names of one brand (with at
// least MIN_BRAND_PRODUCTS products) to count as that supermarket's naming habit.
const HABIT_SHARE = 0.6;
const MIN_BRAND_PRODUCTS = 3;
// Pack quantities are equal within rounding (e.g. 0.33 vs 0.333 l).
const QUANTITY_TOLERANCE = 0.02;

/** Lower case words without accents; keeps "0%" and "48+" together. */
export function normalizeWords(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9%+]+/)
    .map((word) => word.replace(/^[+%]+/, ""))
    .filter((word) => word.length > 0)
    // "jonge"/"jong", "volle"/"vol": the inflected adjective is the same word.
    .map((word) => (word.length > 4 && word.endsWith("e") ? word.slice(0, -1) : word));
}

/** A brand as one word: "Coca-Cola", "Coca Cola" and "cocacola" are all "cocacola". */
export function brandKey(brand: string | null | undefined): string | null {
  const key = normalizeWords(brand).join("");
  return key ? key.slice(0, 100) : null;
}

/** Brand and name words of a product, as stored in products.match_brand / match_tokens. */
export function matchFields(name: string, brand: string | null | undefined): MatchFields {
  const stripped = stripQuantity(name);
  let brandText = brand?.trim() || null;
  let rest = stripped;
  if (!brandText) {
    // Without a brand the first word ("Coca-Cola" in "Coca-Cola Zero") stands in for it.
    const [first, ...others] = stripped.split(/\s+/);
    brandText = first || null;
    rest = others.join(" ");
  }
  const matchBrand = brandKey(brandText);
  const brandWords = normalizeWords(brandText);
  const words = normalizeWords(rest).filter(
    (w) => !brandWords.includes(w) && w !== matchBrand && !FILLER.has(w)
  );
  return { matchBrand, matchTokens: [...new Set(words)].sort().join(" ") };
}

/** A barcode as 8, 12 or 13 digits (a GTIN-14 loses its leading zero); null when not valid. */
export function normalizeEan(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  let digits = String(value).replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0")) digits = digits.slice(1);
  if (![8, 12, 13].includes(digits.length) || /^0+$/.test(digits)) return null;
  // GS1 check digit: weights 3 and 1 from the right, excluding the check digit.
  const body = digits.slice(0, -1);
  const sum = [...body].reverse().reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits.slice(-1)) ? digits : null;
}

/**
 * Words a supermarket uses in most names of one brand, per supermarket.
 * `rows` are the match_tokens of the products of that brand.
 */
export function namingHabits(
  rows: { supermarket: string; matchTokens: string | null }[]
): Map<string, Set<string>> {
  const perSupermarket = new Map<string, string[][]>();
  for (const row of rows) {
    const list = perSupermarket.get(row.supermarket) ?? [];
    list.push((row.matchTokens ?? "").split(" ").filter(Boolean));
    perSupermarket.set(row.supermarket, list);
  }
  const habits = new Map<string, Set<string>>();
  for (const [supermarket, names] of perSupermarket) {
    const habit = new Set<string>();
    if (names.length >= MIN_BRAND_PRODUCTS) {
      const counts = new Map<string, number>();
      for (const words of names) for (const w of new Set(words)) counts.set(w, (counts.get(w) ?? 0) + 1);
      for (const [word, count] of counts) if (count / names.length >= HABIT_SHARE) habit.add(word);
    }
    habits.set(supermarket, habit);
  }
  return habits;
}

function sameQuantity(a: Quantity | null, b: Quantity | null): boolean {
  if (!a || !b || a.unit !== b.unit) return false;
  return Math.abs(a.value - b.value) <= Math.max(a.value, b.value) * QUANTITY_TOLERANCE;
}

const wordsOf = (tokens: string | null) => (tokens ?? "").split(" ").filter(Boolean);

// A habit word only drops out when the other name does not have it, so "vol"
// still counts at a supermarket that uses it in most of a brand's names.
const significant = (own: string[], other: string[], habit: Set<string> | undefined) =>
  own.filter((w) => !(habit?.has(w) && !other.includes(w))).sort().join(" ");

/** True when a and b are the same product (see the module comment). */
export function isSameProduct(
  a: MatchCandidate,
  b: MatchCandidate,
  habits: Map<string, Set<string>> = new Map()
): boolean {
  if (a.ean && b.ean) return a.ean === b.ean;
  if (!a.matchBrand || a.matchBrand !== b.matchBrand) return false;
  if (!sameQuantity(a.quantity, b.quantity)) return false;
  const wordsA = wordsOf(a.matchTokens);
  const wordsB = wordsOf(b.matchTokens);
  return (
    significant(wordsA, wordsB, habits.get(a.supermarket)) ===
    significant(wordsB, wordsA, habits.get(b.supermarket))
  );
}
