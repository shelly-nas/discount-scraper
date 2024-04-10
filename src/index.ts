import WebClient from './utils/WebClient';
import { logger } from './utils/Logger';
import ArgumentHandler from './utils/ArgumentHandler';
import JsonReader from './utils/JsonReader';
import process from 'process';

async function getConfig(): Promise<Grocery> {
    const argHandler = new ArgumentHandler(process.argv);
    const configPath = argHandler.getArgByFlag('--config');

    const reader = new JsonReader(configPath);
    const jsonData = await reader.read();
    
    logger.info('JSON data read from file:', jsonData);
    return jsonData
}

async function main() {
    const grocery = await getConfig();

    const webClient = new WebClient();

    await webClient.init();
    await webClient.navigate(grocery.url);
    await webClient.handleCookiePopup([grocery.cookieDecline])

    for (const productCategory of grocery.productCategories) {
        const discountProducts = await webClient.getProductCategoryDiscountProducts(productCategory, grocery.productDiscounts.name);
        
        if (!discountProducts) {
            logger.error(`No discount products for product category '${productCategory}'.`);
            break;
        }

        for (const discountProduct of discountProducts) {
            const someVariable = await webClient.getDiscountProductDetails(
                discountProduct, 
                grocery.productDiscounts.product.productName, 
                grocery.productDiscounts.product.initialPrice,
                grocery.productDiscounts.product.discountPrice,
                grocery.productDiscounts.product.discountException)
            
            // Create a module that is called JsonWriter.ts that writes to a JSON file.
        }
    }
    
    await webClient.close();
}

main();