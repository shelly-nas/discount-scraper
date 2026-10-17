/**
 * Pack quantities normalised to one base unit per kind, so products of
 * different pack sizes and supermarkets can be compared on price per kilo,
 * liter or piece.
 */
export type QuantityUnit = "kg" | "l" | "stuk";

export interface Quantity {
  value: number;
  unit: QuantityUnit;
}

// Unit words as supermarkets write them, with the factor to the base unit.
const UNITS: Record<string, { unit: QuantityUnit; factor: number }> = {
  mg: { unit: "kg", factor: 0.000001 },
  g: { unit: "kg", factor: 0.001 },
  gr: { unit: "kg", factor: 0.001 },
  gram: { unit: "kg", factor: 0.001 },
  kg: { unit: "kg", factor: 1 },
  kilo: { unit: "kg", factor: 1 },
  kilogram: { unit: "kg", factor: 1 },
  ml: { unit: "l", factor: 0.001 },
  milliliter: { unit: "l", factor: 0.001 },
  cl: { unit: "l", factor: 0.01 },
  centiliter: { unit: "l", factor: 0.01 },
  dl: { unit: "l", factor: 0.1 },
  l: { unit: "l", factor: 1 },
  lt: { unit: "l", factor: 1 },
  ltr: { unit: "l", factor: 1 },
  liter: { unit: "l", factor: 1 },
  st: { unit: "stuk", factor: 1 },
  stk: { unit: "stuk", factor: 1 },
  stuk: { unit: "stuk", factor: 1 },
  stuks: { unit: "stuk", factor: 1 },
  rol: { unit: "stuk", factor: 1 },
  rollen: { unit: "stuk", factor: 1 },
  pak: { unit: "stuk", factor: 1 },
  tabletten: { unit: "stuk", factor: 1 },
  wasbeurten: { unit: "stuk", factor: 1 },
};

const UNIT_PATTERN = Object.keys(UNITS)
  .sort((a, b) => b.length - a.length)
  .join("|");
const NUMBER = "(\\d+(?:[.,]\\d+)?)";
const MULTIPACK = new RegExp(`(\\d+)\\s*(?:x|×)\\s*${NUMBER}\\s*(${UNIT_PATTERN})\\b`, "i");
const SINGLE = new RegExp(`${NUMBER}\\s*(${UNIT_PATTERN})\\b`, "i");
const PER_PIECE = /\bper\s+(stuk|st)\b/i;
// Loose produce sold by weight: the whole pack size is "Per kilo".
const PER_BASE_UNIT = /^\s*per\s+(kilo|kg|liter|l)\s*$/i;

const toNumber = (text: string) => parseFloat(text.replace(",", "."));

function build(amount: number, unitWord: string): Quantity | null {
  const unit = UNITS[unitWord.toLowerCase()];
  if (!unit || !Number.isFinite(amount) || amount <= 0) return null;
  // Round away float noise (0.33 * 6 * 1 = 1.9800000000000002).
  return { value: Math.round(amount * unit.factor * 1e6) / 1e6, unit: unit.unit };
}

/**
 * Reads a pack size such as "500 g", "1,5 liter", "6 x 330 ml", "ca. 1 kg",
 * "4 stuks", "per stuk" or "per kilo". Returns null when no quantity can be read.
 */
export function parseQuantity(text: string | null | undefined): Quantity | null {
  if (!text) return null;
  const multipack = text.match(MULTIPACK);
  if (multipack) {
    return build(parseInt(multipack[1], 10) * toNumber(multipack[2]), multipack[3]);
  }
  const single = text.match(SINGLE);
  if (single) return build(toNumber(single[1]), single[2]);
  if (PER_PIECE.test(text)) return { value: 1, unit: "stuk" };
  const perBase = text.match(PER_BASE_UNIT);
  if (perBase) return build(1, perBase[1]);
  return null;
}

const STRIP_PATTERNS = [
  new RegExp(MULTIPACK.source, "gi"),
  new RegExp(SINGLE.source, "gi"),
  /\bper\s+(stuk|st|kilo|kg|liter|l)\b/gi,
];

/** The text without pack sizes: "Chocomel Vol 1,5 L" becomes "Chocomel Vol". */
export function stripQuantity(text: string): string {
  return STRIP_PATTERNS.reduce((result, pattern) => result.replace(pattern, " "), text)
    .replace(/\s+/g, " ")
    .trim();
}

const formatNumber = (value: number) =>
  String(Math.round(value * 1000) / 1000).replace(".", ",");

/** A quantity as people write it: "500 g", "1,5 liter", "750 ml", "6 stuks". */
export function formatQuantity(quantity: Quantity | null | undefined): string | null {
  if (!quantity || quantity.value <= 0) return null;
  const { value, unit } = quantity;
  if (unit === "kg") return value < 1 ? `${formatNumber(value * 1000)} g` : `${formatNumber(value)} kg`;
  if (unit === "l") return value < 1 ? `${formatNumber(value * 1000)} ml` : `${formatNumber(value)} liter`;
  return value === 1 ? "1 stuk" : `${formatNumber(value)} stuks`;
}

/** Price per kilo, liter or piece, rounded to cents; null without a quantity. */
export function pricePerUnit(
  price: number | null | undefined,
  quantity: Quantity | null | undefined
): { value: number; unit: QuantityUnit } | null {
  if (price === null || price === undefined || !quantity || quantity.value <= 0) return null;
  // In whole cents, so 3.79 for 0.4 kg is 9.48 (not 9.47 from 9.4749999...).
  return { value: Math.round(Math.round(price * 100) / quantity.value) / 100, unit: quantity.unit };
}

const UNIT_LABELS: Record<QuantityUnit, string> = { kg: "per kilo", l: "per liter", stuk: "per stuk" };

/** "€5.18 per kilo" for a price (euro) and quantity. */
export function unitPriceText(price: number | null, quantity: Quantity | null): string | null {
  const perUnit = pricePerUnit(price, quantity);
  return perUnit ? `€${perUnit.value.toFixed(2)} ${UNIT_LABELS[perUnit.unit]}` : null;
}
