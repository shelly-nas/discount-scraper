import { chromium, Browser, Page } from "playwright";
import { logger } from "../../utils/Logger";

class WebClient {
  private browser: Browser | null = null;
  protected page: Page | null = null;
  private headless: boolean = false;

  public async init(): Promise<void> {
    try {
      logger.debug("Initializing browser...");
      this.browser = await chromium.launch({ headless: false, slowMo: 50 });

      const context = await this.browser.newContext();
      this.page = await context.newPage();

      logger.info("Browser initialized successfully.");
    } catch (error) {
      logger.error("Browser initialized unsuccessfully.", error);
      process.exit(1);
    }
  }

  public async navigate(url: string): Promise<void> {
    logger.info(`Navigating to URL: ${url}`);
    await this.page?.goto(url);
  }

  public async handleCookiePopup(selector: string): Promise<void> {
    if (selector) {
      try {
        await this.page?.waitForLoadState("networkidle", { timeout: 10000 });
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
