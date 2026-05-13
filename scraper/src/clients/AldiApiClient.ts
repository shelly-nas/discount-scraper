import { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";
import moment from "moment";

chromium.use(StealthPlugin());

const ALDI_URL = "https://www.aldi.nl/aanbiedingen.html";

interface AldiCurrentPrice {
  priceValue: number;
  validFrom: number;
  validUntil: number;
  priceTagLabels?: { promoText1?: string; promoText2?: string };
}

interface AldiProduct {
  name: string;
  brandName?: string;
  salesUnit?: string;
  mainCategoryID?: string;
  currentPrice?: AldiCurrentPrice;
  isAvailable?: boolean;
}

interface AldiAlgoliaDataMap {
  [productId: string]: AldiProduct;
}

class AldiApiClient extends ApiClient {
  public name = "Aldi";

  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor() {
    super();
    scraperLogger.debug(`Created a '${this.name}' API Client instance.`);
  }

  private async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "nl-NL",
      timezoneId: "Europe/Amsterdam",
      extraHTTPHeaders: { "Accept-Language": "nl-NL,nl;q=0.9" },
    });
    this.page = await this.context.newPage();
  }

  private async close(): Promise<void> {
    await this.browser?.close();
  }

  public async fetchDiscounts(): Promise<{
    discounts: IProductDiscountDetails[];
    expireDate: string;
  }> {
    scraperLogger.info(`Fetching Aldi discounts via __NEXT_DATA__`);

    await this.init();
    if (!this.page) throw new Error("Page not initialized");

    scraperLogger.info(`Navigating to ${ALDI_URL}`);
    await this.page.goto(ALDI_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    const algoliaDataMap = await this.extractAlgoliaDataMap(this.page);

    await this.close();

    if (!algoliaDataMap || Object.keys(algoliaDataMap).length === 0) {
      throw new Error("Aldi: no products found in __NEXT_DATA__");
    }

    return this.parseProducts(algoliaDataMap);
  }

  private async extractAlgoliaDataMap(page: Page): Promise<AldiAlgoliaDataMap> {
    return page.evaluate(() => {
      const raw = document.getElementById("__NEXT_DATA__")?.textContent;
      if (!raw) return {};
      const nextData = JSON.parse(raw);
      // apiData is a double-encoded JSON string containing an array of [key, value] tuples
      const apiDataRaw = nextData?.props?.pageProps?.apiData;
      if (!apiDataRaw) return {};
      const apiData: Array<[string, { res?: { algoliaDataMap?: Record<string, unknown> } }]> =
        JSON.parse(apiDataRaw);
      const offerEntry = apiData.find((entry) => entry[0] === "OFFER_GET");
      return (offerEntry?.[1]?.res?.algoliaDataMap ?? {}) as Record<string, unknown>;
    }) as Promise<AldiAlgoliaDataMap>;
  }

  private parseProducts(algoliaDataMap: AldiAlgoliaDataMap): {
    discounts: IProductDiscountDetails[];
    expireDate: string;
  } {
    const discounts: IProductDiscountDetails[] = [];
    let latestValidUntil = 0;

    for (const product of Object.values(algoliaDataMap)) {
      if (!product.name || !product.currentPrice) continue;
      if (product.isAvailable === false) continue;

      const { priceValue, validUntil, priceTagLabels } = product.currentPrice;

      const name = [product.brandName, product.name, product.salesUnit]
        .filter(Boolean)
        .join(" ")
        .trim();

      const specialDiscount = [
        priceTagLabels?.promoText1,
        priceTagLabels?.promoText2,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      // validUntil is a Unix timestamp (seconds)
      const expireDate = moment.unix(validUntil).endOf("day").toISOString(true);

      discounts.push({
        name,
        originalPrice: 0,
        discountPrice: priceValue ?? 0,
        unitPrice: null,
        specialDiscount,
        category: product.mainCategoryID ?? "Overig",
        supermarket: this.name,
        expireDate,
        productUrl: ALDI_URL,
      });

      if (validUntil > latestValidUntil) {
        latestValidUntil = validUntil;
      }
    }

    const expireDate = latestValidUntil > 0
      ? moment.unix(latestValidUntil).endOf("day").toISOString(true)
      : moment().endOf("isoWeek").endOf("day").toISOString(true);

    scraperLogger.info(
      `Total Aldi discounts: ${discounts.length}, expire: ${expireDate}`
    );

    return { discounts, expireDate };
  }
}

export default AldiApiClient;
