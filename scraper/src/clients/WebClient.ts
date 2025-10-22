import puppeteer, { Browser, Page } from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { logger } from "../utils/Logger";

class WebClient {
  private browser: Browser | null = null;
  protected page: Page | null = null;
  private headless: boolean = false;
  private userAgent: string =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36";

  public async init(): Promise<void> {
    try {
      logger.debug("Initializing browser...");
      puppeteerExtra.use(StealthPlugin());
      this.browser = await puppeteerExtra.launch({
        headless: this.headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      this.page = await this.browser.newPage();
      await this.page.setUserAgent(this.userAgent);
      await this.page.setBypassCSP(true);
      await this.page.setViewport({ width: 1280, height: 720 });

      // Set geolocation permissions
      const context = this.browser.defaultBrowserContext();
      await context.overridePermissions("https://www.ah.nl", ["geolocation"]);
      await this.page.setGeolocation({ latitude: 52.3676, longitude: 4.9041 });

      logger.info("Browser initialized successfully.");
    } catch (error) {
      logger.error("Browser initialized unsuccessfully.", error);
      process.exit(1);
    }
  }

  public async navigate(url: string): Promise<void> {
    logger.info(`Navigating to URL: ${url}`);
    await this.page?.goto(url, { waitUntil: "domcontentloaded" });
    this.page?.once("load", () => logger.debug("Page loaded!"));
  }

  public async handleCookiePopup(selector: string): Promise<void> {
    await this.page?.waitForNetworkIdle({ timeout: 30000 });
    if (selector) {
      try {
        logger.debug(`Found cookie popup with selector '${selector}'.`);
        await this.page?.click(selector);
        logger.info("Dismissed cookie popup");
      } catch (error) {
        logger.error(
          `No cookie popup found with selector: ${selector} or timeout exceeded.`,
          error
        );
      }
    } else {
      logger.info("No cookie popup selector provided to dismiss.");
    }
  }

  async close(): Promise<void> {
    logger.debug("Closing browser...");
    await this.browser?.close();
    logger.info("Browser closed.");
  }
}

export default WebClient;
