
import ArgumentHandler from './utils/helpers/ArgumentHandler';
import DateTimeHandler from './utils/helpers/DateTimeHandler';
import JsonReader from './utils/helpers/JsonReader';
import JsonWriter from './utils/helpers/JsonWriter';
import GroceryClient from './utils/GroceryClient';
import NotionClient from './utils/NotionClient';
import { logger } from './utils/helpers/Logger';
import { GroceryDiscounts } from './utils/objects/GroceryDiscounts'
import { Heading3, Todo, RichText, Divider } from './utils/objects/NotionPages';
import { ElementHandle } from 'playwright';
import process from 'process';
require('dotenv').config();

async function getConfig(): Promise<GroceryWebStore> {
    const argHandler = new ArgumentHandler(process.argv);
    const configPath = argHandler.getArgByFlag('--config');

    const jsonReader = new JsonReader(configPath);
    const jsonData = await jsonReader.read();
    
    logger.info('JSON data read from file:', jsonData);
    return jsonData;
}

async function getGroceryDiscounts(config: GroceryWebStore): Promise<GroceryDiscounts> {
    const groceryClient = new GroceryClient();
    const productDiscounts: ProductDiscount[] = [];

    await groceryClient.init();
    await groceryClient.navigate(config.url);
    await groceryClient.handleCookiePopup(config.webIdentifiers.cookieDecline);
    
    // Iterate over each product category defined in the grocery store's configuration
    for (const productCategory of config.webIdentifiers.productCategories) {
        // Get the products listed under the current category that are on discount
        const discountProducts: ElementHandle[] | undefined = await groceryClient.getDiscountProductsByProductCategory(productCategory, config.webIdentifiers.products);

        if (!discountProducts) {
            logger.error(`No discount products for product category '${productCategory}'.`);
            break;
        }

        // For each discount product found, get its details and append it to the groceryDiscounts
        for (const discountProduct of discountProducts) {
            const productDiscountDetails: ProductDiscount = await groceryClient.getDiscountProductDetails(discountProduct, config.webIdentifiers.promotionProducts);
            productDiscounts.push(productDiscountDetails);
        }
        logger.info(`Discount details are scraped and stored.`);
    }

    // Close the grocery client (e.g., close browser instance, clear resources)
    await groceryClient.close();

    // Use JsonWriter to write the ProductDiscount details to a JSON file
    return new GroceryDiscounts(config.name, productDiscounts);
}

function getEnvVariable(name: string): string {
    const value = process.env[name];
    if (!value) {
        logger.error(`The ${name} environment variable is not set.`);
        process.exit(1);
    }
    return value;
}

async function flushNotionDiscountPage() {
    // Use the NotionClient to set the ProductDiscount details to a Notion page
    const integrationToken = getEnvVariable('NOTION_SECRET');
    const databaseId = getEnvVariable('DISCOUNT_PAGE_ID');

    const notionClient = new NotionClient(integrationToken, databaseId);
    
    
    // TODO: Replace by reading the JSON grocery file and converting to input blocks
    const blocks: any[] = [
        new Heading3([
            new RichText('Albert-Heijn')
        ]),
        new Todo([
            new RichText('Milk')
        ]),
        new Todo([
            new RichText('Nuts')
        ]),
        new Divider(),
    ];

    notionClient.flushPage(blocks);
}

async function main() {
    const groceryConfig = await getConfig();
    const jsonWriter = new JsonWriter(`./export/${groceryConfig.name}_${DateTimeHandler.getDateTimeShort()}.json`);

    const groceryDiscounts = getGroceryDiscounts(groceryConfig)
    await jsonWriter.write(groceryDiscounts);

    flushNotionDiscountPage();
}

main();