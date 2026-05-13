import { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";
import moment from "moment";

chromium.use(StealthPlugin());

const AH_URL = "https://www.ah.nl/bonus";
const BONUS_CATEGORIES_MARKER = "bonusCategories";

interface AhMoney {
  amount: number;
}

interface AhPromotionLabel {
  topText: string | null;
  bottomText: string | null;
}

interface AhPrice {
  now: AhMoney | null;
  was: AhMoney | null;
}

interface AhPromotion {
  id: string;
  title: string;
  subtitle: string | null;
  category: string;
  periodEnd: string;
  storeOnly: boolean;
  promotionLabels: AhPromotionLabel[];
  extraDescriptions: string[];
  price: AhPrice | null;
}

interface AhBonusCategory {
  id: string;
  title: string;
  promotions: AhPromotion[];
}

interface AhBonusCategoriesResponse {
  data: {
    bonusCategories: AhBonusCategory[];
  };
}

// Categories that are not regular AH supermarket promotions
const EXCLUDED_CATEGORY_IDS = new Set(["AHONLINE", "GALL", "GALLCARD", "ETOS"]);

class AhApiClient extends ApiClient {
  public name = "Albert Heijn";

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
    scraperLogger.info(`Fetching Albert Heijn discounts via intercepted GraphQL response`);

    await this.init();
    if (!this.page) throw new Error("Page not initialized");

    let bonusData: AhBonusCategoriesResponse | null = null;

    this.page.on("response", async (resp) => {
      if (resp.url().includes("/gql") && !bonusData) {
        try {
          const text = await resp.text();
          if (text.includes(BONUS_CATEGORIES_MARKER) && text.length > 50000) {
            bonusData = JSON.parse(text);
          }
        } catch {
          scraperLogger.warn("Failed to parse AH GraphQL response");
        }
      }
    });

    scraperLogger.info(`Navigating to ${AH_URL}`);
    await this.page.goto(AH_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    try {
      await this.page.click('[data-testid="accept-cookies"]', { timeout: 8000 });
      await this.page.waitForTimeout(1000);
    } catch {
      scraperLogger.debug("No cookie popup found");
    }

    // Wait for the GraphQL response to arrive after page load
    if (!bonusData) {
      await this.page.waitForTimeout(6000);
    }

    await this.close();

    if (!bonusData) {
      throw new Error("Albert Heijn bonusCategories GraphQL response was not captured");
    }

    return this.parseBonusData(bonusData);
  }

  private parseBonusData(bonusData: AhBonusCategoriesResponse): {
    discounts: IProductDiscountDetails[];
    expireDate: string;
  } {
    const categories = bonusData.data?.bonusCategories ?? [];
    const discounts: IProductDiscountDetails[] = [];
    let latestExpireDate = "";

    for (const cat of categories) {
      if (EXCLUDED_CATEGORY_IDS.has(cat.id)) continue;

      for (const promo of cat.promotions ?? []) {
        if (promo.storeOnly) continue;

        // Derive discount price from label bottomText (e.g. "voor 2.99" → 2.99, "3 voor 5.00" → 5.00)
        const discountPrice = this.extractDiscountPrice(promo.promotionLabels);

        // Original price from price.was if available
        const originalPrice = promo.price?.was?.amount ?? 0;

        // Special discount: combine label texts + extra descriptions
        const specialDiscount = this.buildSpecialDiscount(promo.promotionLabels, promo.extraDescriptions);

        const expireDate = moment(promo.periodEnd, "YYYY-MM-DD").endOf("day").toISOString(true);

        discounts.push({
          name: promo.title,
          originalPrice,
          discountPrice,
          unitPrice: null,
          specialDiscount,
          category: cat.title,
          supermarket: this.name,
          expireDate,
          productUrl: AH_URL,
        });

        if (!latestExpireDate || expireDate > latestExpireDate) {
          latestExpireDate = expireDate;
        }
      }
    }

    scraperLogger.info(
      `Total Albert Heijn discounts: ${discounts.length}, expire: ${latestExpireDate}`
    );

    return { discounts, expireDate: latestExpireDate };
  }

  private extractDiscountPrice(labels: AhPromotionLabel[]): number {
    if (!labels?.length) return 0;
    // Use the first label's bottomText — it's the price/discount value
    // Patterns: "2.99", "5.00", "50%", "1+1", etc.
    const bottom = labels[0].bottomText ?? "";
    const match = bottom.match(/(\d+[.,]\d+)/);
    if (match) return parseFloat(match[1].replace(",", "."));
    return 0;
  }

  private buildSpecialDiscount(labels: AhPromotionLabel[], extra: string[]): string {
    const labelParts = (labels ?? [])
      .map((l) => [l.topText, l.bottomText].filter(Boolean).join(" "))
      .filter(Boolean);

    const allParts = [...labelParts, ...(extra ?? [])];
    // Deduplicate case-insensitively
    const seen = new Set<string>();
    const unique = allParts.filter((p) => {
      const key = p.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.join(" | ").trim();
  }
}

export default AhApiClient;
