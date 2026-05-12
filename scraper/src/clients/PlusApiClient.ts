import { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";
import moment from "moment";

chromium.use(StealthPlugin());

const PLUS_URL = "https://www.plus.nl/aanbiedingen";
const PROMOTION_ENDPOINT = "DataActionGetPromotionList_Optimization";

interface PlusOffer {
  Name: string;
  Brand: string;
  NewPrice: string;
  PriceOriginal_Lowest: string;
  PriceOriginal_Highest: string;
  DisplayInfo_Label: string;
  StartDate: string;
  EndDate: string;
  Package: string;
  IsFreeDeliveryOffer: boolean;
}

interface PlusCategory {
  CategoryId: string;
  CategoryLabel: string;
  Offers: { List: PlusOffer[] };
}

interface PlusPromoItem {
  Category: PlusCategory;
}

interface PlusPromoResponse {
  data: {
    PromotionOfferList: {
      List: PlusPromoItem[];
    };
  };
}

class PlusApiClient extends ApiClient {
  public name = "PLUS";

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
    scraperLogger.info(`Fetching PLUS discounts via intercepted API response`);

    await this.init();
    if (!this.page) throw new Error("Page not initialized");

    let promoData: PlusPromoResponse | null = null;

    this.page.on("response", async (resp) => {
      if (resp.url().includes(PROMOTION_ENDPOINT)) {
        try {
          const text = await resp.text();
          promoData = JSON.parse(text);
        } catch {
          scraperLogger.warn("Failed to parse PLUS promotion response");
        }
      }
    });

    scraperLogger.info(`Navigating to ${PLUS_URL}`);
    await this.page.goto(PLUS_URL, { waitUntil: "networkidle", timeout: 60000 });

    try {
      await this.page.click(".btn-cookies-accept", { timeout: 5000 });
      await this.page.waitForTimeout(1000);
    } catch {
      scraperLogger.debug("No cookie popup found");
    }

    // Trigger lazy-load of the promotion API call if not already fired
    if (!promoData) {
      for (let i = 0; i < 5; i++) {
        await this.page.evaluate(() => {
          const c = document.querySelector(".active-screen.screen-container") as HTMLElement;
          if (c) c.scrollBy(0, 400); else window.scrollBy(0, 400);
        });
        await this.page.waitForTimeout(600);
        if (promoData) break;
      }
    }

    await this.close();

    if (!promoData) {
      throw new Error("PLUS promotion API response was not captured");
    }

    return this.parsePromoData(promoData);
  }

  private parsePromoData(promoData: PlusPromoResponse): {
    discounts: IProductDiscountDetails[];
    expireDate: string;
  } {
    const list = promoData.data?.PromotionOfferList?.List ?? [];
    const discounts: IProductDiscountDetails[] = [];
    let latestExpireDate = "";

    for (const item of list) {
      const cat = item.Category;
      if (!cat) continue;

      const offers = cat.Offers?.List ?? [];
      for (const offer of offers) {
        if (offer.IsFreeDeliveryOffer) continue;

        const name = [offer.Brand, offer.Name, offer.Package]
          .filter(Boolean)
          .join(" ")
          .trim();

        const discountPrice = parseFloat(offer.NewPrice) || 0;
        const originalPrice =
          parseFloat(offer.PriceOriginal_Lowest) ||
          parseFloat(offer.PriceOriginal_Highest) ||
          0;

        // Normalize to end-of-day so discounts stay active through the full last day
        const expireDate = moment(offer.EndDate, "YYYY-MM-DD").endOf("day").toISOString(true);

        discounts.push({
          name,
          originalPrice,
          discountPrice,
          specialDiscount: offer.DisplayInfo_Label,
          category: cat.CategoryLabel,
          supermarket: this.name,
          expireDate,
        });

        if (!latestExpireDate || expireDate > latestExpireDate) {
          latestExpireDate = expireDate;
        }
      }
    }

    scraperLogger.info(
      `Total PLUS discounts: ${discounts.length}, expire: ${latestExpireDate}`
    );

    return { discounts, expireDate: latestExpireDate };
  }
}

export default PlusApiClient;
