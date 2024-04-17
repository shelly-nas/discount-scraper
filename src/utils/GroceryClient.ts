import { logger } from "./helpers/Logger";
import { ElementHandle } from 'playwright';
import WebClient from "./WebClient";

export default class GroceryClient extends WebClient{
    private productCategory: ElementHandle<SVGElement | HTMLElement> | null | undefined;
    
    public async getDiscountProductsByProductCategory(parentSelector: string, productSelector: string): Promise<ElementHandle[] | undefined> {
        logger.debug(`Wait for product category with ID '${parentSelector}' to be visible.`);
        await this.page?.waitForSelector(parentSelector, { state: "visible", timeout: 3000 });
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

    public async getDiscountProductDetails(productSelector: ElementHandle, productConfig: IDiscountDetails): Promise<IProductDiscount> {
        const productDiscountDetails = {
            productCategory: await this.getProductCategoryName(),
            productName: await this.getProductName(productSelector, productConfig.productName),
            originalPrice: await this.getOriginalPrice(productSelector, productConfig.originalPrice),
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
    
    private async getOriginalPrice(anchorHandle: ElementHandle, originalPriceSelector: string[]): Promise<string> {
        try {
            const priceElementHandle = await anchorHandle.$(originalPriceSelector[0]); // Find the child div with the original price
            if (!priceElementHandle) {
                logger.warn(`Original price element with selector '${originalPriceSelector[0]}' not found.`);
                return '';
            }
            const price = await priceElementHandle.getAttribute(originalPriceSelector[1]);
            logger.debug(`Original price retrieved: '${price}'.`);
            return price !== null ? price : '';
        } catch (error) {
            logger.warn(`Warn retrieving original price with selector '${originalPriceSelector[1]}':`, error);
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
            logger.warn(`Warn retrieving discount price with selector '${discountPriceSelector[1]}':`, error);
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
            logger.warn(`Warn retrieving special discount text with selector '${specialDiscountSelector[0]}':`, error);
            return undefined;
        }
    }
}