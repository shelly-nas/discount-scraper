import { ElementHandle } from "playwright";
import GroceryClient from "./GroceryClient";
import { logger } from "./helpers/Logger";

class AhClient extends GroceryClient {

    constructor() {
        super();
        logger.info('Created a Albert Heijn Grocery Client instance.')
    }

    public async getOriginalPrice(anchorHandle: ElementHandle, originalPriceSelector: string[]): Promise<string> {
        try {
            const priceElementHandle = await anchorHandle.$(originalPriceSelector[0]); // Find the child div with the original price
            if (!priceElementHandle) {
                logger.warn(`Original price element with selector '${originalPriceSelector[0]}' not found.`);
                return '';
            }
            const price = await priceElementHandle.getAttribute(originalPriceSelector[1]);
            logger.debug(`Original price retrieved: '${price}'.`);
            return price !== null ? price.trim() : '';
        } catch (error) {
            logger.warn(`Warn retrieving original price with selector '${originalPriceSelector[1]}':`, error);
            return '';
        }
    }

    public async getDiscountPrice(anchorHandle: ElementHandle, discountPriceSelector: string[]): Promise<string> {
        try {
            const priceElementHandle = await anchorHandle.$(discountPriceSelector[0]); // Find the child div with the discount price
            if (!priceElementHandle) {
                logger.warn(`Discount price element with selector '${discountPriceSelector[0]}' not found.`);
                return '';
            }
            const price = await priceElementHandle.getAttribute(discountPriceSelector[1]);
            logger.debug(`Discount price retrieved: '${price}'.`);
            return price !== null ? price.trim() : '';
        } catch (error) {
            logger.warn(`Warn retrieving discount price with selector '${discountPriceSelector[1]}':`, error);
            return '';
        }
    }
}

export default AhClient;