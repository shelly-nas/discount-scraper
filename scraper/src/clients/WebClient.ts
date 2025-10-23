import { Browser, Page, BrowserContext } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { scraperLogger } from "../utils/Logger";

// Add stealth plugin to playwright-extra
chromium.use(StealthPlugin());

class WebClient {
  private browser: Browser | null = null;
  protected page: Page | null = null;
  private context: BrowserContext | null = null;
  private headless: boolean = true;
  private userAgent: string =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  public async init(): Promise<void> {
    try {
      scraperLogger.debug("Initializing browser with stealth mode...");
      this.browser = await chromium.launch({
        timeout: 20000,
        headless: this.headless,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });

      this.context = await this.browser.newContext({
        userAgent: this.userAgent,
        viewport: { width: 1280, height: 720 },
        locale: "nl-NL",
        timezoneId: "Europe/Amsterdam",
        // geolocation: { latitude: 52.3676, longitude: 4.9041 },
        // permissions: ["geolocation"],
        // Additional anti-detection measures
        extraHTTPHeaders: {
          "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });

      this.page = await this.context.newPage();

      scraperLogger.info(
        "Browser initialized successfully with stealth mode and tracing enabled."
      );
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      throw new Error(`Failed to initialize browser: ${errorMessage}`);
    }
  }

  public async navigate(url: string): Promise<void> {
    scraperLogger.info(`Navigating to URL: ${url}`);
    await this.page?.goto(url, { waitUntil: "domcontentloaded" });
    scraperLogger.debug("Page loaded!");
  }

  public async handleCookiePopup(
    selector: string,
    timeout: number = 20000
  ): Promise<void> {
    if (!selector) {
      scraperLogger.info("No cookie popup selector provided to dismiss.");
      return;
    }

    try {
      scraperLogger.debug(
        `Waiting for cookie popup with selector '${selector}'...`
      );

      // Wait for the cookie popup to appear
      await this.page?.waitForSelector(selector, {
        state: "visible",
        timeout: timeout,
      });

      scraperLogger.debug(`Cookie popup found`);

      // Click the accept/dismiss button
      await this.page?.click(selector);

      // Wait for the popup to disappear
      await this.page
        ?.waitForSelector(selector, {
          state: "hidden",
          timeout: 10000,
        })
        .catch(() => {
          scraperLogger.debug(
            "Cookie popup might still be visible or already gone"
          );
        });

      scraperLogger.info("Cookie popup dismissed successfully");
    } catch (error) {
      scraperLogger.warn(
        `Cookie popup not found with selector: ${selector} within ${timeout}ms or already handled by context.`
      );
    }
  }

  async close(): Promise<void> {
    scraperLogger.debug("Closing browser...");

    await this.browser?.close();
    scraperLogger.info("Browser closed.");
  }
}

export default WebClient;
