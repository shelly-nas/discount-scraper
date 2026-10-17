import { Browser, Page } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { scraperLogger } from "../../utils/Logger";
import { parseQuantity, Quantity } from "../../utils/Quantity";

chromium.use(StealthPlugin());

// plus.nl is an OutSystems app behind Imperva, so it is read through a real
// browser. Its product list pages call the screen action below; without a
// category slug it lists the whole assortment (12 products per page), and the
// "Nu in de aanbieding" filter narrows it to the products on offer. The
// request the page itself sends is the template: it carries the current
// module/api versions and the week period, which change with every release.
export const PLUS_BASE = "https://www.plus.nl";
const START_URL = `${PLUS_BASE}/producten`;
const PRODUCT_LIST_ACTION =
  "/screenservices/ECP_Composition_CW/ProductLists/PLP_Content/DataActionGetProductListAndCategoryInfo";
export const PLUS_OFFER_FILTER = "&tn_fk_ae-is_aanbieding=Nu%20in%20de%20aanbieding";
const REQUEST_DELAY_MS = 250;
const MAX_ATTEMPTS = 4;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";

/** One product tile; prices are strings, NewPrice is "0" without a single promotion price. */
export interface PlusProduct {
  SKU: string;
  Brand: string;
  Name: string;
  Product_Subtitle: string;
  Slug: string;
  ImageURL: string;
  OriginalPrice: string;
  NewPrice: string;
  Categories: { List: { Name: string }[] } | null;
  IsAvailable: boolean;
  PromotionLabel: string;
  PromotionBasedLabel: string;
  PromotionStartDate: string;
  PromotionEndDate: string;
  IsFreeDeliveryOffer: boolean;
}

export interface PlusPage {
  totalPages: number;
  totalItems: number;
  products: PlusProduct[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const plusPrice = (text: string | null | undefined): number | null => {
  const value = parseFloat(text ?? "");
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
};

/** "Per 1000 ml" -> "1000 ml"; "Per kilo" stays. */
export function plusUnitSize(product: PlusProduct): string | null {
  const text = product.Product_Subtitle?.trim();
  if (!text) return null;
  return /^per\s+\d/i.test(text) ? text.replace(/^per\s+/i, "") : text;
}

export function plusQuantity(product: PlusProduct): Quantity | null {
  return parseQuantity(product.Product_Subtitle) ?? parseQuantity(product.Name);
}

/**
 * The product image at 400 px as WebP: PLUS images are on Contentful, whose
 * image API scales on request (the original PNG is often over 1 MB).
 */
export function plusImageUrl(product: PlusProduct): string | null {
  const url = product.ImageURL?.trim();
  if (!url) return null;
  return /images\.ctfassets\.net/.test(url) && !url.includes("?") ? `${url}?w=400&fm=webp` : url;
}

export function plusProductUrl(product: PlusProduct): string | null {
  return product.Slug ? `${PLUS_BASE}/product/${product.Slug}` : null;
}

export function plusCategory(product: PlusProduct): string {
  return product.Categories?.List?.[0]?.Name?.trim() || "Overig";
}

class PlusSite {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private template: any = null;

  async open(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    const context = await this.browser.newContext({
      userAgent: USER_AGENT,
      locale: "nl-NL",
      timezoneId: "Europe/Amsterdam",
      extraHTTPHeaders: { "Accept-Language": "nl-NL,nl;q=0.9" },
    });
    this.page = await context.newPage();

    const captured = this.page.waitForRequest((req) => req.url().includes(PRODUCT_LIST_ACTION), { timeout: 60000 });
    await this.page.goto(START_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    const request = await captured.catch(() => null);
    const body = request?.postData();
    if (!body) throw new Error("PLUS: the product list request was not seen on plus.nl");
    this.template = JSON.parse(body);
    scraperLogger.debug(`PLUS: product list template captured (${JSON.stringify(this.template.versionInfo)})`);
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
    this.browser = null;
    this.page = null;
  }

  /** One page of the assortment (no slug, so every category), optionally filtered. */
  async listPage(pageNumber: number, filterQuery = ""): Promise<PlusPage> {
    if (!this.page || !this.template) throw new Error("PLUS: site not opened");
    const body = JSON.parse(JSON.stringify(this.template));
    Object.assign(body.screenData.variables, {
      PageNumber: pageNumber,
      CategorySlug: "",
      SearchKeyword: "",
      IsSearch: false,
      FilterQueryURL: filterQuery,
    });

    const step = `page ${pageNumber}${filterQuery ? " (offers)" : ""}`;
    for (let attempt = 1; ; attempt++) {
      const result = await this.page.evaluate(
        async ({ url, payload }) => {
          const cookie = document.cookie.match(/nr2Users=([^;]+)/)?.[1] ?? "";
          const csrf = decodeURIComponent(cookie).match(/crf=([^;]+)/)?.[1] ?? "";
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "content-type": "application/json; charset=UTF-8",
              accept: "application/json",
              "x-csrftoken": csrf,
              "outsystems-locale": "nl-NL",
            },
            body: payload,
          });
          return { status: response.status, text: await response.text() };
        },
        { url: PRODUCT_LIST_ACTION, payload: JSON.stringify(body) }
      );

      if (result.status === 200) {
        const json = JSON.parse(result.text);
        if (json.exception) throw new Error(`PLUS ${step}: ${json.exception.message ?? "server error"}`);
        const data = json.data ?? {};
        return {
          totalPages: data.TotalPages ?? 0,
          totalItems: data.TotalNumberItems ?? 0,
          products: (data.ProductList?.List ?? []).map((item: any) => item.PLP_Str).filter((p: any) => p?.SKU),
        };
      }
      const retryable = result.status === 429 || result.status >= 500;
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        throw new Error(`PLUS ${step}: HTTP ${result.status} ${result.text.slice(0, 120)}`);
      }
      scraperLogger.warn(`PLUS: ${step} HTTP ${result.status}, retry ${attempt}/${MAX_ATTEMPTS - 1}`);
      await sleep(REQUEST_DELAY_MS * 2 ** attempt * 5);
    }
  }

  /** Walks every page; each product is delivered once. Returns the number of products. */
  async forEachPage(filterQuery: string, onPage: (products: PlusProduct[]) => Promise<void>): Promise<number> {
    const seen = new Set<string>();
    let totalPages = 1;
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await this.listPage(pageNumber, filterQuery);
      if (pageNumber === 1) {
        totalPages = page.totalPages;
        scraperLogger.info(`PLUS: ${page.totalItems} products on ${totalPages} pages${filterQuery ? " (offers)" : ""}`);
      }
      const fresh = page.products.filter((p) => !seen.has(p.SKU));
      fresh.forEach((p) => seen.add(p.SKU));
      if (fresh.length > 0) await onPage(fresh);
      await sleep(REQUEST_DELAY_MS);
    }
    return seen.size;
  }
}

export default PlusSite;
