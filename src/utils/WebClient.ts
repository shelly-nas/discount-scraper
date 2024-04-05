import { chromium, Browser, Page } from 'playwright';
import Logger from './Logger';

class WebClient {
    private browser: Browser | null = null;
    private page: Page | null = null;

    async init(): Promise<void> {
        Logger.debug('Initializing browser...');
        this.browser = await chromium.launch({ headless: true });
        this.page = await this.browser.newPage();
        Logger.info('Browser initialized successfully.');
    }

    async navigate(url: string): Promise<void> {
        if (!this.page) {
            //Logger.error('Browser or page not initialized. Call init() first.');
            throw new Error("Browser or page not initialized. Call init() first.");
        }
        //Logger.info(`Navigating to URL: ${url}`);
        await this.page.goto(url);
    }

    async getTitle(): Promise<string | null> {
        Logger.debug('Retrieving page title...');
        return this.page?.title() ?? null;
    }

    async close(): Promise<void> {
        Logger.debug('Closing browser...');
        await this.browser?.close();
        Logger.info('Browser closed.');
    }
}

export default WebClient;