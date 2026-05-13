import { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";
import moment from "moment";

chromium.use(StealthPlugin());

const HOOGVLIET_URL =
  "https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen";

const NL_MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
  juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11,
};

class HoogvlietApiClient extends ApiClient {
  public name = "Hoogvliet";

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
    scraperLogger.info(`Fetching Hoogvliet discounts via pagination`);

    await this.init();
    if (!this.page) throw new Error("Page not initialized");

    scraperLogger.info(`Navigating to ${HOOGVLIET_URL}`);
    await this.page.goto(HOOGVLIET_URL, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    const ajaxBaseUrl = await this.page.evaluate(() => {
      const link = document.getElementById(
        "showMorePromotionProducts_0"
      ) as HTMLAnchorElement | null;
      return link?.href ?? null;
    });

    if (!ajaxBaseUrl) {
      throw new Error("Hoogvliet: could not find showMorePromotionProducts_0 link");
    }

    // Extract expiry date from PromotionRange param
    const expireDate = this.parseExpireDate(ajaxBaseUrl);
    scraperLogger.info(`Hoogvliet expiry date: ${expireDate}`);

    // Paginate through all product pages
    const allDiscounts: IProductDiscountDetails[] = [];
    for (let pageNum = 1; pageNum <= 30; pageNum++) {
      const url = ajaxBaseUrl.replace("PageNumber=1", `PageNumber=${pageNum}`);

      const html = await this.page.evaluate(async (fetchUrl) => {
        const res = await fetch(fetchUrl, { method: "POST" });
        return res.text();
      }, url) as string;

      // Stop when page returns no products
      if (!html.includes("product-list-item")) break;

      const pageDiscounts = this.parseHtml(html, expireDate);
      allDiscounts.push(...pageDiscounts);
      scraperLogger.debug(
        `Hoogvliet page ${pageNum}: ${pageDiscounts.length} products`
      );
    }

    await this.close();

    scraperLogger.info(
      `Total Hoogvliet discounts: ${allDiscounts.length}, expire: ${expireDate}`
    );

    return { discounts: allDiscounts, expireDate };
  }

  private parseExpireDate(ajaxUrl: string): string {
    const rangeMatch = ajaxUrl.match(/PromotionRange=([^&]+)/);
    if (!rangeMatch) {
      return moment().endOf("isoWeek").endOf("day").toISOString(true);
    }

    // Decode twice: URL encodes the already-encoded value
    const promotionRange = decodeURIComponent(decodeURIComponent(rangeMatch[1])).replace(/\+/g, " ");

    // Format: "Aanbiedingen | 8 september - 14 september"
    const dateMatch = promotionRange.match(/(\d{1,2})\s+(\w+)\s*$/);
    if (!dateMatch) {
      return moment().endOf("isoWeek").endOf("day").toISOString(true);
    }

    const day = parseInt(dateMatch[1], 10);
    const month = NL_MONTHS[dateMatch[2].toLowerCase()];
    if (month === undefined) {
      return moment().endOf("isoWeek").endOf("day").toISOString(true);
    }

    return moment()
      .year(new Date().getFullYear())
      .month(month)
      .date(day)
      .endOf("day")
      .toISOString(true);
  }

  private parseHtml(
    html: string,
    expireDate: string
  ): IProductDiscountDetails[] {
    const discounts: IProductDiscountDetails[] = [];
    const itemBlocks = html.split('<div class="product-list-item');
    itemBlocks.shift();

    for (const block of itemBlocks) {
      // Extract product data from data-track-click attribute
      const trackMatch = block.match(/data-track-click='(\{[\s\S]*?\})'\s*\n/);
      if (!trackMatch) continue;

      let name = "";
      let category = "";
      let trackPrice = "";
      try {
        const cleaned = trackMatch[1].replace(/&#47;/g, "/");
        const data = JSON.parse(cleaned);
        name = data.products?.[0]?.name ?? "";
        category = data.products?.[0]?.category ?? "";
        trackPrice = data.products?.[0]?.price ?? "";
      } catch {
        continue;
      }

      if (!name) continue;

      // Discount price from price-euros (integer part) + price-cents (sup)
      const eurosMatch = block.match(/price-euros[^>]*><span[^>]*>\s*(\d+)\s*<\/span>/);
      const centsMatch = block.match(/price-cents[^>]*><sup>\s*(\d+)\s*<\/sup>/);
      const euros = eurosMatch?.[1] ?? "";
      const cents = centsMatch?.[1] ?? "";
      const discountPrice =
        euros !== ""
          ? parseFloat(`${euros}.${cents.padStart(2, "0")}`)
          : parseFloat(trackPrice) || 0;

      // Original price from strikethrough div
      const strikeMatch = block.match(/strikethrough"><div>([^<]+)<\/div>/);
      const originalPrice = strikeMatch
        ? parseFloat(strikeMatch[1].trim()) || 0
        : 0;

      // Promotion short title
      const promoMatch = block.match(/promotion-short-title">([^<]+)<\/div>/);
      const specialDiscount = promoMatch?.[1]?.trim() ?? "";

      // Category: last meaningful segment of the path
      const categoryParts = category.split("/").map((p) => p.trim()).filter(Boolean);
      const leafCategory = categoryParts[categoryParts.length - 1] ?? "Overig";

      discounts.push({
        name,
        originalPrice,
        discountPrice,
        unitPrice: null,
        specialDiscount,
        category: leafCategory,
        supermarket: this.name,
        expireDate,
        productUrl: HOOGVLIET_URL,
      });
    }

    return discounts;
  }
}

export default HoogvlietApiClient;
