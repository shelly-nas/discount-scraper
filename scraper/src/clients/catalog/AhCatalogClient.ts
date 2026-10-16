import axios, { AxiosInstance } from "axios";
import CatalogClient from "./CatalogClient";
import { ICatalogProduct } from "../../interfaces/ICatalogProduct";
import { scraperLogger } from "../../utils/Logger";

// Albert Heijn's mobile app API. An anonymous token is enough to read the
// product catalog; products are listed per top-level category (taxonomy).
// Headers and client id follow the current iOS app; the API answers outdated
// app versions with errors such as 503.
const API_BASE = "https://api.ah.nl";
const CLIENT_ID = "appie-ios";
const CLIENT_VERSION = "9.28";
const PAGE_SIZE = 200;
const REQUEST_DELAY_MS = 300;
const MAX_ATTEMPTS = 4;

interface AhCategory {
  id: number;
  name: string;
}

interface AhImage {
  width: number;
  height: number;
  url: string;
}

interface AhProduct {
  webshopId: number;
  title: string;
  brand?: string;
  salesUnitSize?: string;
  unitPriceDescription?: string;
  currentPrice?: number;
  priceBeforeBonus?: number;
  isBonus?: boolean;
  mainCategory?: string;
  subCategory?: string;
  images?: AhImage[];
}

interface AhSearchResponse {
  products?: AhProduct[];
  page?: { totalPages: number; number: number; totalElements: number };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Turns an HTTP failure into an error that says which call failed and why. */
export function describeError(step: string, error: any): Error {
  const status = error?.response?.status;
  if (!status) return new Error(`AH ${step}: ${error?.message ?? "request failed"}`);
  const body = error.response.data;
  const text = (typeof body === "string" ? body : JSON.stringify(body ?? ""))
    .replace(/\s+/g, " ")
    .slice(0, 200);
  return new Error(`AH ${step}: HTTP ${status}${text && text !== '""' ? ` - ${text}` : ""}`);
}

/** Maps one AH product to the catalog shape; null when it has no usable price. */
export function mapAhProduct(product: AhProduct, category: string): ICatalogProduct | null {
  // During a bonus, currentPrice is the offer price and priceBeforeBonus the
  // regular one; otherwise only one of them may be present.
  const price = product.priceBeforeBonus ?? product.currentPrice;
  if (price === undefined || price === null || !product.title) return null;

  const image = [...(product.images ?? [])].sort((a, b) => a.width - b.width)
    .find((i) => i.width >= 200) ?? product.images?.[0];

  return {
    externalId: String(product.webshopId),
    name: product.title.trim(),
    brand: product.brand?.trim() || null,
    category: product.mainCategory?.trim() || category,
    unitSize: product.salesUnitSize?.trim() || null,
    price,
    priceSource: "supermarket",
    unitPrice: product.unitPriceDescription?.trim() || null,
    imageUrl: image?.url ?? null,
    productUrl: `https://www.ah.nl/producten/product/wi${product.webshopId}`,
  };
}

class AhCatalogClient extends CatalogClient {
  readonly supermarket = "Albert Heijn";

  private http: AxiosInstance;

  constructor(http?: AxiosInstance) {
    super();
    this.http =
      http ??
      axios.create({
        baseURL: API_BASE,
        timeout: 30000,
        headers: {
          "User-Agent": `Appie/${CLIENT_VERSION} (iPhone17,3; iPhone; CPU OS 26_1 like Mac OS X)`,
          "x-client-name": CLIENT_ID,
          "x-client-version": CLIENT_VERSION,
          "x-application": "AHWEBSHOP",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
  }

  /**
   * Runs one API call. A catalog run takes a while: renew an expired token and
   * back off on rate limiting or server errors before giving up. The final
   * error names the step, the HTTP status and the start of the response body.
   */
  private async request<T>(step: string, call: () => Promise<{ data: T }>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await call();
        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        const retryable = status === 401 || status === 429 || (status >= 500 && status < 600);
        if (!retryable || attempt >= MAX_ATTEMPTS) throw describeError(step, error);
        scraperLogger.warn(`AH catalog: ${step} HTTP ${status}, retry ${attempt}/${MAX_ATTEMPTS - 1}`);
        if (status === 401 && step !== "token") await this.authenticate();
        await sleep(REQUEST_DELAY_MS * 2 ** attempt * 5);
      }
    }
  }

  private async authenticate(): Promise<void> {
    const data = await this.request<{ access_token?: string }>("token", () =>
      this.http.post("/mobile-auth/v1/auth/token/anonymous", { clientId: CLIENT_ID })
    );
    const token = data?.access_token;
    if (!token) throw new Error("AH: no anonymous access token returned");
    this.http.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  private async fetchCategories(): Promise<AhCategory[]> {
    const data = await this.request<AhCategory[]>("categories", () =>
      this.http.get("/mobile-services/v1/product-shelves/categories")
    );
    return data ?? [];
  }

  private async fetchPage(categoryId: number, page: number): Promise<AhSearchResponse> {
    const data = await this.request<AhSearchResponse>(`search category ${categoryId} page ${page}`, () =>
      this.http.get("/mobile-services/product/search/v2", {
        params: { taxonomyId: categoryId, page, size: PAGE_SIZE, sortOn: "RELEVANCE" },
      })
    );
    return data ?? {};
  }

  async fetchCatalog(onPage: (products: ICatalogProduct[]) => Promise<void>): Promise<void> {
    await this.authenticate();
    const categories = await this.fetchCategories();
    if (categories.length === 0) throw new Error("AH: no product categories returned");
    scraperLogger.info(`AH catalog: ${categories.length} categories`);

    for (const category of categories) {
      let page = 0;
      let totalPages = 1;
      while (page < totalPages) {
        const data = await this.fetchPage(category.id, page);
        totalPages = data.page?.totalPages ?? 0;
        const products = (data.products ?? [])
          .map((p) => mapAhProduct(p, category.name))
          .filter((p): p is ICatalogProduct => p !== null);
        scraperLogger.info(
          `AH catalog: '${category.name}' page ${page + 1}/${Math.max(totalPages, 1)}: ${products.length} products`
        );
        if (products.length > 0) await onPage(products);
        page++;
        await sleep(REQUEST_DELAY_MS);
      }
    }
  }
}

export default AhCatalogClient;
