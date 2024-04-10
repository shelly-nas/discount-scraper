import { chromium, Browser, Page, ElementHandle } from 'playwright';
import { logger } from './Logger';

class WebClient {
    private browser: Browser | null = null;
    private page: Page | null = null;

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
                // process.exit(0);
            }
        }
        logger.info('Dismissed cookie popup');
    }

    public async getProductCategoryDiscountProducts(parentSelector: string, productSelector: string): Promise<ElementHandle[] | undefined> {
        await this.page?.waitForSelector(parentSelector, { state: "visible", timeout: 3000 });
        logger.debug(`Found section for product category with ID '${parentSelector}'.`);
        const productCategory = await this.page?.$(parentSelector);
        
        if (!productCategory) {
            logger.error(`Section with ID '${parentSelector}' not found.`);
            return;
        }
    
        let discountProducts;
        try {
            discountProducts = await productCategory.$$(productSelector);
            logger.debug(`Found ${discountProducts.length} elements for discount products under the parent selector '${parentSelector}'.`);
        } catch (error) {
            logger.error(`Error finding elements for discount products with selector '${productSelector}':`, error);
            return;
        }
        
        return discountProducts;
    }

    public async getDiscountProductDetails(productSelector: ElementHandle, productNameSelector: string[], initialPriceSelector: string[], discountPriceSelector: string[], specialDiscountSelector: string[]): Promise<ProductDiscount> {
        
        
        return {
            productName: await this.getProductName(productSelector, productNameSelector),
            initialPrice: await this.getInitialPrice(productSelector, initialPriceSelector),
            discountPrice: await this.getDiscountPrice(productSelector, discountPriceSelector),
            specialDiscount: await this.getSpecialDiscount(productSelector, specialDiscountSelector),
        }
    }

    private async getProductName(anchorHandle: ElementHandle, productNameSelector: string[]): Promise<string> {
        try {
            const productName = await anchorHandle.$eval(productNameSelector[0], el => el.textContent?.trim()) || '';
            logger.debug(`Product name retrieved: '${productName}'.`);
            return productName;
        } catch (error) {
            logger.error(`Error retrieving product name with selector '${productNameSelector[0]}':`, error);
            return '';
        }
    }
    
    private async getInitialPrice(anchorHandle: ElementHandle, initialPriceSelector: string[]): Promise<string> {
        try {
            const priceElementHandle = await anchorHandle.$(initialPriceSelector[0]); // Find the child div with the initial price
            if (!priceElementHandle) {
                logger.warn(`Initial price element with selector '${initialPriceSelector[0]}' not found.`);
                return '';
            }
            const price = await priceElementHandle.getAttribute(initialPriceSelector[1]);
            logger.debug(`Initial price retrieved: '${price}'.`);
            return price !== null ? price : '';
        } catch (error) {
            logger.warn(`Error retrieving initial price with selector '${initialPriceSelector[1]}':`, error);
            return '';
        }
    }
    
    private async getDiscountPrice(anchorHandle: ElementHandle, discountPriceSelector: string[]): Promise<string> {
        try {
            const priceElementHandle = await anchorHandle.$(discountPriceSelector[0]); // Find the child div with the discount price
            if (!priceElementHandle) {
                logger.warn(`Discount price element with selector '${discountPriceSelector[0]}' not found.`);
                return '';
            }
            const price = await priceElementHandle.getAttribute(discountPriceSelector[1]);
            logger.debug(`Discount price retrieved: '${price}'.`);
            return price !== null ? price : '';
        } catch (error) {
            logger.warn(`Error retrieving discount price with selector '${discountPriceSelector[1]}':`, error);
            return '';
        }
    }
    
    private async getSpecialDiscount(anchorHandle: ElementHandle, specialDiscountSelector: string[]): Promise<string | undefined> {
        try {
            let specialDiscountText = await anchorHandle.$$eval(specialDiscountSelector[0],
                (spans) => spans.map((span) => span.textContent).filter(Boolean)
            );
            const specialDiscount = specialDiscountText.join(' ');
            logger.debug(`Special discount text retrieved: '${specialDiscount}'.`);
            return specialDiscount;
        } catch (error) {
            logger.warn(`Error retrieving special discount text with selector '${specialDiscountSelector[0]}':`, error);
            return undefined;
        }
    }

    async close(): Promise<void> {
        logger.debug('Closing browser...');
        await this.browser?.close();
        logger.info('Browser closed.');
    }
}

export default WebClient;