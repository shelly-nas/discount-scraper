import { logger } from "./helpers/Logger";
import { Page, ElementHandle } from 'playwright';
import WebClient from "./WebClient";

export default class GroceryClient extends WebClient{
    private productCategory: ElementHandle<SVGElement | HTMLElement> | null | undefined;
    
    public async getDiscountProductsByProductCategory(parentSelector: string, productSelector: string): Promise<ElementHandle[] | undefined> {
        await this.page?.waitForSelector(parentSelector, { state: "visible", timeout: 3000 });
        logger.debug(`Found section for product category with ID '${parentSelector}'.`);
        this.productCategory = await this.page?.$(parentSelector);
        
        if (!this.productCategory) {
            logger.error(`Section with ID '${parentSelector}' not found.`);
            return;
        }
    
        let discountProducts;
        try {
            discountProducts = await this.productCategory.$$(productSelector);
            logger.info(`Found ${discountProducts.length} elements for discount products under the parent selector '${parentSelector}'.`);
        } catch (error) {
            logger.error(`Error finding elements for discount products with selector '${productSelector}':`, error);
        }

        return discountProducts
    }

    public async getDiscountProductDetails(productSelector: ElementHandle, productConfig: DiscountDetails): Promise<ProductDiscount> {
        const productDiscountDetails = {
            productCategory: await this.getProductCategoryName(),
            productName: await this.getProductName(productSelector, productConfig.productName),
            initialPrice: await this.getInitialPrice(productSelector, productConfig.initialPrice),
            discountPrice: await this.getDiscountPrice(productSelector, productConfig.discountPrice),
            specialDiscount: await this.getSpecialDiscount(productSelector, productConfig.specialDiscount)
        }
        logger.info(`Product details a scraped for '${productDiscountDetails.productName}'.`);

        return productDiscountDetails
    }

    private async getProductCategoryName(): Promise<string> {
        try {
            const productCategoryHandle = await this.productCategory?.$('h3')
            let productCategoryName = '';
            
            if (productCategoryHandle) {
                productCategoryName = await productCategoryHandle.evaluate(el => el.textContent?.trim() || '');
            }
            
            logger.debug(`Product category name retrieved: '${productCategoryName}'.`);
            return productCategoryName;
        } catch (error) {
            logger.error(`Error retrieving product name with selector '${this.productCategory}':`, error);
            return '';
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
}