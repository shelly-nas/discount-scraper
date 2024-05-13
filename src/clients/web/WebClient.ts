import { chromium, Browser, Page } from "playwright";
import { logger } from "../../utils/Logger";

class WebClient {
  private browser: Browser | null = null;
  protected page: Page | null = null;
  private headless: boolean = true;
  private userAgent: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";

  public async init(): Promise<void> {
    try {
      logger.debug("Initializing browser...");
      this.browser = await chromium.launch({ headless: this.headless, slowMo: 50 });

      const context = await this.browser.newContext({ userAgent: this.userAgent, bypassCSP: true, viewport: { width: 1280, height: 720 } });
      this.page = await context.newPage();

      logger.info("Browser initialized successfully.");
    } catch (error) {
      logger.error("Browser initialized unsuccessfully.", error);
      process.exit(1);
    }
  }

  public async navigate(url: string): Promise<void> {
    logger.info(`Navigating to URL: ${url}`);
    await this.page?.goto(url, { waitUntil: "commit" });
    this.page?.once('load', () => logger.debug('Page loaded!'));
  }

  public async handleCookiePopup(selector: string): Promise<void> {
    await this.page?.waitForLoadState("domcontentloaded", { timeout: 30000 });
    // await this.page?.screenshot({ path: 'page.png', fullPage: true})
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
