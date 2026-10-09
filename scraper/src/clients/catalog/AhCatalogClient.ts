import axios, { AxiosInstance } from "axios";
import CatalogClient from "./CatalogClient";
import { ICatalogProduct } from "../../interfaces/ICatalogProduct";
import { scraperLogger } from "../../utils/Logger";

// Albert Heijn's mobile app API. An anonymous token is enough to read the
// product catalog; products are listed per top-level category (taxonomy).
const API_BASE = "https://api.ah.nl";
const PAGE_SIZE = 750;
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
          "User-Agent": "Appie/8.22.3",
          "x-application": "AHWEBSHOP",
          "Content-Type": "application/json",
        },
      });
  }

  private async authenticate(): Promise<void> {
    const response = await this.http.post("/mobile-auth/v1/auth/token/anonymous", {
      clientId: "appie",
    });
    const token = response.data?.access_token;
    if (!token) throw new Error("AH: no anonymous access token returned");
    this.http.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  private async fetchCategories(): Promise<AhCategory[]> {
    const response = await this.http.get<AhCategory[]>(
      "/mobile-services/v1/product-shelves/categories"
    );
    return response.data ?? [];
  }

  private async fetchPage(categoryId: number, page: number): Promise<AhSearchResponse> {
    // A catalog run takes a while: renew an expired token and back off on
    // rate limiting or server errors before giving up on the run.
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await this.http.get<AhSearchResponse>(
          "/mobile-services/product/search/v2",
          { params: { taxonomyId: categoryId, page, size: PAGE_SIZE, sortOn: "RELEVANCE" } }
        );
        return response.data ?? {};
      } catch (error: any) {
        const status = error?.response?.status;
        const retryable = status === 401 || status === 429 || (status >= 500 && status < 600);
        if (!retryable || attempt >= MAX_ATTEMPTS) throw error;
        scraperLogger.warn(`AH catalog: HTTP ${status}, retry ${attempt}/${MAX_ATTEMPTS - 1}`);
        if (status === 401) await this.authenticate();
        await sleep(REQUEST_DELAY_MS * 2 ** attempt * 5);
      }
    }
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
