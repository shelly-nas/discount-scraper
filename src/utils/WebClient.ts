import { chromium, Browser, Page } from 'playwright';
import { logger } from './Logger';

class WebClient {
    private browser: Browser | null = null;
    private page: Page | null = null;

    async init(): Promise<void> {
        logger.debug('Initializing browser...');
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();
        logger.info('Browser initialized successfully.');
    }

    async navigate(url: string): Promise<void> {
        logger.info(`Navigating to URL: ${url}`);
        await this.page?.goto(url);
    }

    async handleCookiePopup(selectors: string[]): Promise<void> {
        for (const selector of selectors) {
            try {
                await this.page?.waitForSelector(selector, { timeout: 5000 });
                logger.debug(`Found cookie popup with selector: ${selector}`);
                this.page?.click(selector)
                logger.info('Dismissed cookie popup');
                break; // Exit the loop if we successfully clicked a popup button
            } catch (error) {
                logger.debug(`No cookie popup found with selector: ${selector} or timeout exceeded.`);
            }
        }
    }

    async getTitle(): Promise<string | null> {
        logger.debug('Retrieving page title...');
        return this.page?.title() ?? null;
    }

    async close(): Promise<void> {
        logger.debug('Closing browser...');
        await this.browser?.close();
        logger.info('Browser closed.');
    }
}

export default WebClient;