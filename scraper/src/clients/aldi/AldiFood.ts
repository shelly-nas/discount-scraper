import { AldiProduct } from "./AldiAlgolia";

// Only food and drink is kept from Aldi. Regular products carry Aldi's own
// categories; top-level categories are food, non-food or mixed (house brands,
// seasonal ranges), where the subcategory decides.
const FOOD_CATEGORIES = new Set([
  "Aardappels, groente en fruit",
  "Bier, mixdranken, aperitieven en likeuren",
  "Borrelhapjes",
  "Brood, bakkerij en bakken",
  "Chips, noten en zoutjes",
  "Diepvries",
  "Kaas en vleeswaren",
  "Maaltijden en salades",
  "Ontbijtgranen, beleg en tussendoortjes",
  "Pasta, rijst en wereldkeuken",
  "Sappen, frisdrank, siropen en water",
  "Snoep, koek en chocolade",
  "Soepen, sauzen, kruiden en conserven",
  "Thee en koffie",
  "Vlees, vis en vega",
  "Wijn",
  "Zuivel, eieren en boter",
]);
const NON_FOOD_CATEGORIES = new Set(["Baby en drogisterij", "Huishouden", "Huisdieren"]);
const FOOD_SUBCATEGORY =
  /snoep|ontbijt|brunch|diner|chocolade|borrel|voorgerecht|dessert|wijn|gourmetten|verse producten|fairtrade/i;
const NON_FOOD_SUBCATEGORY =
  /cadeau|speelgoed|spellen|puzzel|fashion|bouwsets|baby en peuter|verlichting|versiering|kookgerei|keukengerei|pannen/i;

// A weight or volume on the pack ("500 g", "6x330 ml", "Per kg").
const PACK_SIZE = /\d\s*(?:mg|g|gr|gram|kg|kilo|ml|cl|dl|l|lt|liter)\b|\bper\s*(?:kg|kilo|liter)\b/i;
// Thresholds for the food probability, tuned on the folder of 12-18 October
// 2026: household products with a pack size score about 0.4, the least
// certain food (sauces) about 0.55.
const FOOD_WITH_PACK_SIZE = 0.5;
const FOOD_WITHOUT_PACK_SIZE = 0.6;

/**
 * Food (true) or non-food (false) from the product's own Aldi categories;
 * null when they do not tell, e.g. for week offers, which have none.
 */
export function aldiCategoryFood(product: AldiProduct): boolean | null {
  const top = new Set((product.hierarchicalCategories?.lvl0 ?? []).map((c) => c.trim()));
  if ([...top].some((c) => FOOD_CATEGORIES.has(c))) return true;
  if ([...top].some((c) => NON_FOOD_CATEGORIES.has(c))) return false;
  for (const path of product.hierarchicalCategories?.lvl1 ?? []) {
    const sub = path.split(">").pop() ?? "";
    if (NON_FOOD_SUBCATEGORY.test(sub)) return false;
    if (FOOD_SUBCATEGORY.test(sub)) return true;
  }
  return null;
}

/** Name words (3+ letters, without accents) and the brand. */
function features(product: AldiProduct): Set<string> {
  const normalize = (text: string | null | undefined) =>
    (text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const words = new Set(normalize(product.name).match(/[a-z]{3,}/g) ?? []);
  const brand = normalize(product.brandName).trim();
  if (brand) words.add(`brand:${brand}`);
  return words;
}

const hasPackSize = (product: AldiProduct) =>
  PACK_SIZE.test(`${product.salesUnit ?? ""} ${product.name ?? ""}`);

/**
 * Naive Bayes over name words and brand, learned from the regular products
 * whose category tells food from non-food. Used for week offers, which have
 * no category. Words are smoothed in proportion to class size, so a word seen
 * only a few times in food (e.g. "prei") still counts as food.
 */
export class AldiFoodModel {
  private counts: [Map<string, number>, Map<string, number>] = [new Map(), new Map()];
  private totals: [number, number] = [0, 0];

  constructor(labelled: { product: AldiProduct; food: boolean }[]) {
    for (const { product, food } of labelled) {
      const y = food ? 1 : 0;
      this.totals[y]++;
      for (const word of features(product)) this.counts[y].set(word, (this.counts[y].get(word) ?? 0) + 1);
    }
  }

  /**
   * Probability that the product is food. Without the prior, words the model
   * never saw leave it at 0.5 instead of leaning to food (most of the
   * catalog), so unknown items such as clothing are not taken for food.
   */
  foodProbability(product: AldiProduct, withPrior: boolean): number {
    const [n0, n1] = this.totals;
    const total = n0 + n1;
    const logs = withPrior ? [Math.log(n0 / total), Math.log(n1 / total)] : [0, 0];
    for (const word of features(product)) {
      const c0 = this.counts[0].get(word) ?? 0;
      const c1 = this.counts[1].get(word) ?? 0;
      if (c0 + c1 === 0) continue;
      logs[0] += Math.log((c0 + n0 / total) / (n0 + 1));
      logs[1] += Math.log((c1 + n1 / total) / (n1 + 1));
    }
    const max = Math.max(logs[0], logs[1]);
    const [e0, e1] = [Math.exp(logs[0] - max), Math.exp(logs[1] - max)];
    return e1 / (e0 + e1);
  }

  /**
   * Items with a weight or volume are mostly food, but also shampoo,
   * detergent and pet food, which the catalog knows; items sold per piece,
   * pair or set are food only when their words clearly say so.
   */
  isFood(product: AldiProduct): boolean {
    if (this.totals[0] === 0 || this.totals[1] === 0) return true;
    return hasPackSize(product)
      ? this.foodProbability(product, true) >= FOOD_WITH_PACK_SIZE
      : this.foodProbability(product, false) >= FOOD_WITHOUT_PACK_SIZE;
  }
}

/**
 * A food check for Aldi products: the product's own category when it tells,
 * else a model learned from the regular products' categories.
 */
export function aldiFoodFilter(regular: AldiProduct[]): (product: AldiProduct) => boolean {
  const labelled: { product: AldiProduct; food: boolean }[] = [];
  for (const product of regular) {
    const food = aldiCategoryFood(product);
    if (food !== null) labelled.push({ product, food });
  }
  const model = new AldiFoodModel(labelled);
  return (product) => aldiCategoryFood(product) ?? model.isFood(product);
}
