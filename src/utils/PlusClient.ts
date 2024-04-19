import { ElementHandle } from "playwright";
import GroceryClient from "./GroceryClient";
import { logger } from "./helpers/Logger";

class PlusClient extends GroceryClient {

    constructor() {
        super();
        logger.info('Created a PLUS Grocery Client instance.')
    }

    protected async getProductName(anchorHandle: ElementHandle, productNameSelector: string[]): Promise<string> {
        try {
            const productName = await anchorHandle.getAttribute(productNameSelector[0]) || '';
            logger.debug(`Product name retrieved: '${productName}'.`);
            return productName.trim();
        } catch (error) {
            logger.error(`Error retrieving product name with selector '${productNameSelector[0]}':`, error);
            return '';
        }
    }

    public async getOriginalPrice(anchorHandle: ElementHandle, originalPriceSelector: string[]): Promise<string> {
        try {
            const price = await anchorHandle.$eval(originalPriceSelector[0], span => span.textContent);
            logger.debug(`Original price retrieved: '${price}'.`);
            return price !== null ? price.trim() : '';
        } catch (error) {
            logger.warn(`Warn retrieving original price with selector '${originalPriceSelector[0]}':`, error);
            return '';
        }
    }

    public async getDiscountPrice(anchorHandle: ElementHandle, discountPriceSelector: string[]): Promise<string> {
        try {
            // const price = await anchorHandle.evaluate((node: Element, selectors) => {
            //     const euros = node.querySelector(selectors[0])?.textContent || '0';
            //     let cents = node.querySelector(selectors[1])?.textContent ||
            //                 node.querySelector(selectors[2])?.textContent || '00';
            //     return `${euros}.${cents}`;
            // }, discountPriceSelector);

            const price = await anchorHandle.evaluate((node: Element, selectors: string[]) => {
                const euros = node.querySelector(selectors[0])?.textContent || '';
                const cents = node.querySelector(selectors[1])?.textContent || '';
                return `${euros}${cents}`;
            }, discountPriceSelector);
            logger.debug(`Discount price retrieved: '${price}'.`);
            return price !== null ? price.trim() : '';
        } catch (error) {
            logger.warn(`Warn retrieving discount price with selector '${discountPriceSelector[1]}':`, error);
            return '';
        }
    }
}

export default PlusClient;