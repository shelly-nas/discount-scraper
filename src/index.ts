import WebClient from './utils/WebClient';
import { logger } from './utils/Logger';
import ArgumentHandler from './utils/ArgumentHandler';
import DateTimeHandler from './utils/DateTimeHandler';
import GroceryDiscounts from './utils/interfaces/GroceryDiscounts'
import JsonReader from './utils/JsonReader';
import JsonWriter from './utils/JsonWriter';
import process from 'process';
import GroceryClient from './utils/GroceryClient';


async function getConfig(): Promise<Grocery> {
    const argHandler = new ArgumentHandler(process.argv);
    const configPath = argHandler.getArgByFlag('--config');

    const reader = new JsonReader(configPath);
    const jsonData = await reader.read();
    
    logger.info('JSON data read from file:', jsonData);
    return jsonData
}

async function main() {
    const groceryConfig = await getConfig();
    const groceryClient = new GroceryClient();
    const jsonWriter = new JsonWriter(`./export/${groceryConfig.name}_${DateTimeHandler.getDateTimeShort()}.json`);
    const groceryDiscounts = new GroceryDiscounts(groceryConfig.name);

    await groceryClient.init();
    await groceryClient.navigate(groceryConfig.url);
    await groceryClient.handleCookiePopup([groceryConfig.webIdentifiers.cookieDecline]);

    
    for (const productCategory of groceryConfig.webIdentifiers.productCategories) {
        // groceryDiscounts.productCategory = productCategory;
        const discountProducts = await groceryClient.getProductCategoryDiscountProducts(productCategory, groceryConfig.webIdentifiers.products
        );

        if (!discountProducts) {
            logger.error(`No discount products for product category '${productCategory}'.`);
            break;
        }

        for (const discountProduct of discountProducts) {
            const productDiscountDetails: Discount = await groceryClient.getDiscountProductDetails(discountProduct, groceryConfig.webIdentifiers.promotionProducts);
            groceryDiscounts.appendDiscount(productDiscountDetails);
        }
    }

    // Use JsonWriter to write the ProductDiscount details to a JSON file.
    await jsonWriter.write(groceryDiscounts.exportAsObject());

    await groceryClient.close();
}

main();