import { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";
import moment from "moment";

chromium.use(StealthPlugin());

// Stable URL — does a 301 redirect to the current week's offers page automatically
const LIDL_URL = "https://www.lidl.nl/aanbiedingen";

interface LidlGridboxImpression {
  name: string;
  price: number;
  category: string;
  wonCategoryPrimary: string;
}

class LidlApiClient extends ApiClient {
  public name = "Lidl";

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
    scraperLogger.info(`Fetching Lidl discounts via Playwright HTML scraping`);

    await this.init();
    if (!this.page) throw new Error("Page not initialized");

    scraperLogger.info(`Navigating to ${LIDL_URL}`);
    await this.page.goto(LIDL_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    try {
      await this.page.click('[data-testid="cookie-accept-button"]', { timeout: 8000 });
      await this.page.waitForTimeout(1000);
    } catch {
      scraperLogger.debug("No cookie popup found");
    }

    // Scroll until product count stabilises — products are lazy-loaded as skeletons
    await this.scrollUntilStable();

    // Extract expiry date from the badge text (e.g. "Alleen in de winkel 11/05 - 17/05")
    const expireDate = await this.extractExpireDate();

    // Extract all product data from data-gridbox-impression attributes
    const rawProducts = await this.page.evaluate(() => {
      const boxes = document.querySelectorAll<HTMLElement>("[data-gridbox-impression]");
      const results: Array<{ raw: string }> = [];
      boxes.forEach((el) => {
        const raw = el.getAttribute("data-gridbox-impression");
        if (raw) results.push({ raw });
      });
      return results;
    });

    await this.close();

    const discounts = this.parseProducts(rawProducts.map((r) => r.raw), expireDate);

    scraperLogger.info(
      `Total Lidl discounts: ${discounts.length}, expire: ${expireDate}`
    );

    return { discounts, expireDate };
  }

  private async scrollUntilStable(): Promise<void> {
    if (!this.page) return;

    let previousCount = 0;
    let stableRounds = 0;

    for (let i = 0; i < 30; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 800));
      await this.page.waitForTimeout(500);

      const count = await this.page.evaluate(
        () => document.querySelectorAll("[data-gridbox-impression]").length
      );

      if (count === previousCount) {
        stableRounds++;
        if (stableRounds >= 3) break;
      } else {
        stableRounds = 0;
        previousCount = count;
      }
    }

    scraperLogger.debug(`Lidl product count after scrolling: ${previousCount}`);
  }

  private async extractExpireDate(): Promise<string> {
    if (!this.page) return moment().endOf("day").toISOString(true);

    try {
      const badgeTexts = await this.page.evaluate(() => {
        const badges = document.querySelectorAll<HTMLElement>(".ods-badge__label");
        return Array.from(badges).map((b) => b.textContent?.trim() ?? "");
      });

      // Badge format: "Alleen in de winkel 11/05 - 17/05" or "Alleen in de winkel vanaf 13/05 - 17/05"
      const datePattern = /(\d{2}\/\d{2})\s*-\s*(\d{2}\/\d{2})/;
      const currentYear = moment().year();

      let latestEndDate = "";
      for (const text of badgeTexts) {
        const match = text.match(datePattern);
        if (!match) continue;

        // match[2] is the end date (DD/MM)
        const [day, month] = match[2].split("/");
        const candidate = moment(
          `${currentYear}-${month}-${day}`,
          "YYYY-MM-DD"
        ).endOf("day").toISOString(true);

        if (!latestEndDate || candidate > latestEndDate) {
          latestEndDate = candidate;
        }
      }

      if (latestEndDate) return latestEndDate;
    } catch {
      scraperLogger.warn("Failed to extract Lidl expire date from badge");
    }

    // Fallback: end of current week (Sunday)
    return moment().endOf("isoWeek").endOf("day").toISOString(true);
  }

  private parseProducts(
    rawList: string[],
    expireDate: string
  ): IProductDiscountDetails[] {
    const discounts: IProductDiscountDetails[] = [];

    for (const raw of rawList) {
      try {
        const data: LidlGridboxImpression = JSON.parse(decodeURIComponent(raw));

        if (!data.name) continue;

        // Use last segment of the category path as the category label
        const categoryPath = data.wonCategoryPrimary ?? data.category ?? "";
        const category = categoryPath.split("/").filter(Boolean).pop() ?? data.category ?? "Overig";

        discounts.push({
          name: data.name,
          originalPrice: 0,
          discountPrice: data.price ?? 0,
          specialDiscount: "",
          category,
          supermarket: this.name,
          expireDate,
        });
      } catch {
        scraperLogger.warn("Failed to parse Lidl gridbox impression JSON");
      }
    }

    return discounts;
  }
}

export default LidlApiClient;
