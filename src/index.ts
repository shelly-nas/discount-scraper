
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

/**
 * This asynchronous function reads the configuration for the GroceryWebStore from the provided config file.
 * It uses an `ArgumentHandler` to parse command line arguments to locate the configuration file.
 * The JSON data is read using a `JsonReader` and logged before being returned as a Promise.
 */
async function getConfig(): Promise<GroceryWebStore> {
    const argHandler = new ArgumentHandler(process.argv);
    const configPath = argHandler.getArgByFlag('--config');

    const jsonReader = new JsonReader(configPath);
    const jsonData = await jsonReader.read();
    
    logger.info('JSON data read from file:', jsonData);
    return jsonData;
}

function setNotionDatabase(jsonPath: string) {
    if (!process.env.NOTION_SECRET) {
        logger.error(`The NOTION_SECRET environment variable is not set: '${process.env.NOTION_SECRET}'.`);
        return;
    }
    if (!process.env.DISCOUNT_PAGE_ID) {
        logger.error(`The DISCOUNT_PAGE_ID environment variable is not set: '${process.env.DISCOUNT_PAGE_ID}'.`);
        return;
    }
    const integrationToken = process.env.NOTION_SECRET;
    const databaseId = process.env.DISCOUNT_PAGE_ID;
    const filePath = jsonPath;
    
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

/**
 * Main function that initializes and manages the scraping process for grocery discounts.
 */
async function main() {
    const groceryConfig = await getConfig();
    const groceryClient = new GroceryClient();
    const jsonWriter = new JsonWriter(`./export/${groceryConfig.name}_${DateTimeHandler.getDateTimeShort()}.json`);
    const productDiscounts: ProductDiscount[] = [];

    await groceryClient.init();
    await groceryClient.navigate(groceryConfig.url);
    await groceryClient.handleCookiePopup(groceryConfig.webIdentifiers.cookieDecline);
    
    // Iterate over each product category defined in the grocery store's configuration
    for (const productCategory of groceryConfig.webIdentifiers.productCategories) {
        // Get the products listed under the current category that are on discount
        const discountProducts: ElementHandle[] | undefined = await groceryClient.getDiscountProductsByProductCategory(productCategory, groceryConfig.webIdentifiers.products);

        if (!discountProducts) {
            logger.error(`No discount products for product category '${productCategory}'.`);
            break;
        }

        // For each discount product found, get its details and append it to the groceryDiscounts
        for (const discountProduct of discountProducts) {
            const productDiscountDetails: ProductDiscount = await groceryClient.getDiscountProductDetails(discountProduct, groceryConfig.webIdentifiers.promotionProducts);
            productDiscounts.push(productDiscountDetails);
        }
        logger.info(`Discount details are scraped and stored.`);
    }

    // Use JsonWriter to write the ProductDiscount details to a JSON file
    const groceryDiscounts = new GroceryDiscounts(groceryConfig.name, productDiscounts);
    await jsonWriter.write(groceryDiscounts);

    // Close the grocery client (e.g., close browser instance, clear resources)
    await groceryClient.close();

    // Use the NotionClient to set the ProductDiscount details to a Notion page
    setNotionDatabase(jsonWriter.getFilePath())
}

main();