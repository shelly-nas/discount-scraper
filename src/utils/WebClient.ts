import { chromium, Browser, Page } from 'playwright';
import { logger } from './helpers/Logger';

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
                await this.page?.waitForSelector(selector, { state: "visible", timeout: 3000 });
                logger.debug(`Found cookie popup with selector '${selector}'.`);
                await this.page?.click(selector);
                logger.info('Dismissed cookie popup');
            } catch (error) {
                logger.error(`No cookie popup found with selector: ${selector} or timeout exceeded.`, error);
            }
        } else {
            logger.info('No cookie popup selector provided to dismiss.');
        }
    }
    
    async close(): Promise<void> {
        logger.debug('Closing browser...');
        await this.browser?.close();
        logger.info('Browser closed.');
    }
}