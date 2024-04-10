import { chromium, Browser, Page } from 'playwright';
import { logger } from './Logger';

export default class WebClient {
    private browser: Browser | null = null;
    protected page: Page | null = null;

    public async init(): Promise<void> {
        try {
            logger.debug('Initializing browser...');
            this.browser = await chromium.launch({ headless: false, slowMo: 50 });
            this.page = await this.browser.newPage();
            logger.info('Browser initialized successfully.');
        } catch (error) {
            logger.error('Browser initialized unsuccessfully.', error)
        }
    }

    public async navigate(url: string): Promise<void> {
        logger.info(`Navigating to URL: ${url}`);
        await this.page?.goto(url);
    }

    public async handleCookiePopup(selectors: string[]): Promise<void> {
        for (const selector of selectors) {
            try {
                await this.page?.waitForSelector(selector, { state: "visible", timeout: 3000 });
                logger.debug(`Found cookie popup with selector '${selector}'.`);
                await this.page?.click(selector)
            } catch (error) {
                logger.error(`No cookie popup found with selector: ${selector} or timeout exceeded.`, error);
                // process.exit(1);
            }
        }
        logger.info('Dismissed cookie popup');
    }

    async close(): Promise<void> {
        logger.debug('Closing browser...');
        await this.browser?.close();
        logger.info('Browser closed.');
    }
}