import axios, { AxiosInstance } from "axios";
import { scraperLogger } from "../../utils/Logger";
import { parseQuantity, Quantity } from "../../utils/Quantity";

// aldi.nl's product pages are built from an Algolia index; the site ships the
// application id and a search-only key in its own JavaScript. One query
// without a search term returns the whole index (about 4,000 objects, at most
// 1,000 per page): the regular assortment plus the week offers, which are
// separate objects in category "offer" (often a different article, e.g. a
// multipack; some reuse the article id with a leading 9).
export const ALDI_BASE = "https://www.aldi.nl";
const APP_ID = "2HU29PF6BH";
const SEARCH_KEY = "686cf0c8ddcf740223d420d1115c94c1";
const INDEX = "an_prd_nl_nl_products2";
const HITS_PER_PAGE = 1000;
const MAX_PAGES = 20;
const REQUEST_DELAY_MS = 300;
const MAX_ATTEMPTS = 3;
export const OFFER_CATEGORY = "offer";

export interface AldiPrice {
  priceValue: number;
  validFrom: number;
  validUntil: number;
  priceTagLabels?: { promoText1?: string; promoText2?: string };
}

export interface AldiProduct {
  objectID: string;
  name: string;
  brandName?: string | null;
  salesUnit?: string | null;
  productSlug?: string | null;
  mainCategoryID?: string | null;
  categoryIDs?: string[] | null;
  hierarchicalCategories?: { lvl0?: string[]; lvl1?: string[] } | null;
  assets?: { type: string; url: string }[] | null;
  currentPrice?: AldiPrice | null;
  isAvailable?: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const slug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const isAldiOffer = (product: AldiProduct) => (product.categoryIDs ?? []).includes(OFFER_CATEGORY);

/** Brand and name, as on the shelf label ("MILSANI Protein melk drink"). */
export function aldiName(product: AldiProduct): string | null {
  const name = product.name?.trim();
  if (!name) return null;
  const brand = product.brandName?.trim();
  return brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name;
}

/**
 * The shelf the product is filed under: the top-level category of its main
 * category ("Zuivel, eieren en boter > Verse zuivel" for "verse-zuivel"),
 * else its first top-level category.
 */
export function aldiCategory(product: AldiProduct): string {
  const main = product.mainCategoryID;
  for (const path of product.hierarchicalCategories?.lvl1 ?? []) {
    const [top, leaf] = path.split(">").map((s) => s.trim());
    if (main && leaf && slug(leaf) === main && top) return top;
  }
  return product.hierarchicalCategories?.lvl0?.[0]?.trim() || "Overig";
}

export function aldiQuantity(product: AldiProduct): Quantity | null {
  return parseQuantity(product.salesUnit) ?? parseQuantity(product.name);
}

export function aldiProductUrl(product: AldiProduct): string | null {
  return product.productSlug ? `${ALDI_BASE}/product/${product.productSlug}.html` : null;
}

export function aldiImageUrl(product: AldiProduct): string | null {
  const assets = product.assets ?? [];
  return (assets.find((a) => a.type === "primary") ?? assets[0])?.url ?? null;
}

class AldiAlgolia {
  private http: AxiosInstance;

  constructor(http?: AxiosInstance) {
    this.http =
      http ??
      axios.create({
        baseURL: `https://${APP_ID}-dsn.algolia.net`,
        timeout: 60000,
        headers: {
          "X-Algolia-Application-Id": APP_ID,
          "X-Algolia-API-Key": SEARCH_KEY,
          "Content-Type": "application/json",
          Origin: ALDI_BASE,
          Referer: `${ALDI_BASE}/`,
        },
      });
  }

  private async page(page: number): Promise<{ hits: AldiProduct[]; nbPages: number; nbHits: number }> {
    const step = `page ${page + 1}`;
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await this.http.post(`/1/indexes/${INDEX}/query`, {
          query: "",
          hitsPerPage: HITS_PER_PAGE,
          page,
          attributesToHighlight: [],
          attributesToSnippet: [],
        });
        return {
          hits: response.data?.hits ?? [],
          nbPages: response.data?.nbPages ?? 0,
          nbHits: response.data?.nbHits ?? 0,
        };
      } catch (error: any) {
        const status = error?.response?.status;
        const retryable = !status || status === 429 || status >= 500;
        if (!retryable || attempt >= MAX_ATTEMPTS) {
          const detail = error?.response?.data?.message ?? error?.message ?? "request failed";
          throw new Error(`Aldi ${step}: ${status ? `HTTP ${status} ` : ""}${detail}`);
        }
        scraperLogger.warn(`Aldi: ${step} ${status ?? error?.message}, retry ${attempt}/${MAX_ATTEMPTS - 1}`);
        await sleep(REQUEST_DELAY_MS * 2 ** attempt * 5);
      }
    }
  }

  /** Every object in the index, regular products and offers alike. */
  async all(): Promise<AldiProduct[]> {
    const products: AldiProduct[] = [];
    const seen = new Set<string>();
    let pages = 1;
    for (let page = 0; page < pages && page < MAX_PAGES; page++) {
      const result = await this.page(page);
      if (page === 0) {
        pages = result.nbPages;
        scraperLogger.info(`Aldi: ${result.nbHits} objects in the product index`);
      }
      for (const hit of result.hits) {
        if (!hit?.objectID || seen.has(hit.objectID)) continue;
        seen.add(hit.objectID);
        products.push(hit);
      }
      await sleep(REQUEST_DELAY_MS);
    }
    if (products.length === 0) throw new Error("Aldi: the product index returned no products");
    return products;
  }
}

export default AldiAlgolia;
