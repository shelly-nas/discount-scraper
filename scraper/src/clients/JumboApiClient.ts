import { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";
import moment from "moment";

chromium.use(StealthPlugin());

const JUMBO_URL = "https://www.jumbo.com/aanbiedingen";

// Dutch weekday/month names used in heavy-promotion-card subtitle (e.g. "wo 6 t/m di 12 mei")
const DUTCH_MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mrt: 3, apr: 4, mei: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12,
};

interface RawCard {
  name: string;
  priceTag: string;
  expDate: string; // ISO string from expiration-date attr, or parsed from subtitle
}

class JumboApiClient extends ApiClient {
  public name = "Jumbo";

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
    scraperLogger.info(`Fetching Jumbo discounts via Playwright HTML scraping`);

    await this.init();
    if (!this.page) throw new Error("Page not initialized");

    scraperLogger.info(`Navigating to ${JUMBO_URL}`);
    await this.page.goto(JUMBO_URL, { waitUntil: "networkidle", timeout: 60000 });

    // Accept cookie banner if present
    try {
      await this.page.click('[data-testid="accept-cookies-button"], button#onetrust-accept-btn-handler', { timeout: 6000 });
      await this.page.waitForTimeout(1000);
    } catch {
      scraperLogger.debug("No cookie popup found");
    }

    // Wait for at least one product heading to hydrate
    try {
      await this.page.waitForFunction(() => {
        const heads = document.querySelectorAll('[data-testid="jum-heading"]');
        return Array.from(heads).some((h) => (h.textContent ?? "").trim().length > 2);
      }, { timeout: 15000 });
    } catch {
      scraperLogger.warn("Jumbo product headings did not load in time");
    }

    // Scroll to trigger lazy-loaded sections
    await this.scrollUntilStable();

    const rawCards = await this.extractCards();
    await this.close();

    const discounts = this.parseCards(rawCards);
    const expireDate = this.latestExpireDate(rawCards);

    scraperLogger.info(
      `Total Jumbo discounts: ${discounts.length}, expire: ${expireDate}`
    );

    return { discounts, expireDate };
  }

  private async scrollUntilStable(): Promise<void> {
    if (!this.page) return;

    let previousCount = 0;
    let stableRounds = 0;

    for (let i = 0; i < 25; i++) {
      await this.page.evaluate(() => window.scrollBy(0, 800));
      await this.page.waitForTimeout(400);

      const count = await this.page.evaluate(
        () =>
          document.querySelectorAll(
            '[data-testid="promotion-card"], [data-testid="heavy-promotion-card"]'
          ).length
      );

      if (count === previousCount) {
        stableRounds++;
        if (stableRounds >= 3) break;
      } else {
        stableRounds = 0;
        previousCount = count;
      }
    }

    scraperLogger.debug(`Jumbo card count after scrolling: ${previousCount}`);
  }

  private async extractCards(): Promise<RawCard[]> {
    if (!this.page) return [];

    return this.page.evaluate((dutchMonths: Record<string, number>) => {
      const results: Array<{ name: string; priceTag: string; expDate: string }> = [];

      // promotion-card has expiration-date attribute — most reliable
      document.querySelectorAll<HTMLElement>('[data-testid="promotion-card"]').forEach((card) => {
        const name = card.querySelector('[data-testid="jum-heading"]')?.textContent?.trim() ?? "";
        if (!name) return;
        const priceTag = card.querySelector('[data-testid="jum-tag"]')?.textContent?.trim() ?? "";
        const expDate = card.getAttribute("expiration-date") ?? "";
        results.push({ name, priceTag, expDate });
      });

      // heavy-promotion-card — parse subtitle text ("wo 6 t/m di 12 mei")
      document.querySelectorAll<HTMLElement>('[data-testid="heavy-promotion-card"]').forEach((card) => {
        const name = card.querySelector('[data-testid="jum-heading"]')?.textContent?.trim() ?? "";
        if (!name) return;
        const priceTag = card.querySelector('[data-testid="jum-tag"]')?.textContent?.trim() ?? "";
        const subtitle = card.querySelector(".subtitle")?.textContent?.trim() ?? "";

        // Try to parse "wo 6 t/m di 12 mei" → end date is "12 mei"
        const match = subtitle.match(/(\d{1,2})\s+([a-z]{3})\s*$/i);
        let expDate = "";
        if (match) {
          const day = parseInt(match[1], 10);
          const monthKey = match[2].toLowerCase();
          const month = (dutchMonths as Record<string, number>)[monthKey];
          if (month) {
            const year = new Date().getFullYear();
            const d = new Date(year, month - 1, day, 23, 59, 59);
            expDate = d.toISOString();
          }
        }
        results.push({ name, priceTag, expDate });
      });

      return results;
    }, DUTCH_MONTHS);
  }

  /**
   * Parse a numeric discount price from Dutch price tag strings.
   * Handles: "€1,49", "2 voor €3,00", "3 voor €5,-", "50% korting", "1+1 gratis"
   * Returns 0 when no price can be extracted.
   */
  private parsePriceTag(priceTag: string): number {
    if (!priceTag) return 0;

    // "N voor €X,XX" or "N voor €X,-" — return X/N (unit price)
    const voorMatch = priceTag.match(/(\d+)\s+voor\s+€\s*(\d+)[,.](\d{2}|-)/i);
    if (voorMatch) {
      const count = parseInt(voorMatch[1], 10);
      const euros = parseInt(voorMatch[2], 10);
      const cents = voorMatch[3] === "-" ? 0 : parseInt(voorMatch[3], 10);
      return Math.round((euros * 100 + cents) / count) / 100;
    }

    // Plain "€X,XX" or "€X,-"
    const plainMatch = priceTag.match(/€\s*(\d+)[,.](\d{2}|-)/);
    if (plainMatch) {
      const euros = parseInt(plainMatch[1], 10);
      const cents = plainMatch[2] === "-" ? 0 : parseInt(plainMatch[2], 10);
      return euros + cents / 100;
    }

    return 0;
  }

  private parseCards(rawCards: RawCard[]): IProductDiscountDetails[] {
    const seen = new Set<string>();
    const discounts: IProductDiscountDetails[] = [];

    for (const card of rawCards) {
      if (!card.name) continue;

      // Deduplicate — heavy and regular carousels can repeat the same product
      if (seen.has(card.name)) continue;
      seen.add(card.name);

      const expireDate = card.expDate
        ? moment(card.expDate).endOf("day").toISOString(true)
        : moment().endOf("isoWeek").endOf("day").toISOString(true);

      const discountPrice = this.parsePriceTag(card.priceTag);

      discounts.push({
        name: card.name,
        originalPrice: 0,
        discountPrice,
        unitPrice: null,
        specialDiscount: card.priceTag,
        category: "Aanbieding",
        supermarket: this.name,
        expireDate,
        productUrl: JUMBO_URL,
      });
    }

    return discounts;
  }

  private latestExpireDate(rawCards: RawCard[]): string {
    let latest = "";
    for (const card of rawCards) {
      if (!card.expDate) continue;
      const iso = moment(card.expDate).endOf("day").toISOString(true);
      if (!latest || iso > latest) latest = iso;
    }
    return latest || moment().endOf("isoWeek").endOf("day").toISOString(true);
  }
}

export default JumboApiClient;
