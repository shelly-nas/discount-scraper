
import ArgumentHandler from './utils/helpers/ArgumentHandler';
import DateTimeHandler from './utils/helpers/DateTimeHandler';
import JsonReader from './utils/helpers/JsonReader';
import JsonWriter from './utils/helpers/JsonWriter';
import NotionPageConverter from './utils/helpers/NotionPageConverter';
import GroceryClient from './utils/GroceryClient';
import NotionClient from './utils/NotionClient';
import { logger } from './utils/helpers/Logger';
import { GroceryDiscounts } from './utils/objects/GroceryDiscounts'
import { ElementHandle } from 'playwright';
import process from 'process';
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
require('dotenv').config();

function getEnvVariable(name: string): string {
    const value = process.env[name];
    if (!value) {
        logger.error(`The ${name} environment variable is not set.`);
        process.exit(1);
    }
    return value;
}

async function getConfig(): Promise<IGroceryWebStore> {
    const groceryWebStoreSchemaFilePath = getEnvVariable('GROCERY_SCHEMA');
    const argHandler = new ArgumentHandler(process.argv);
    const configPath = argHandler.getArgByFlag('--config');

    const jsonReader = new JsonReader(groceryWebStoreSchemaFilePath, configPath);
    const jsonData = await jsonReader.read() as IGroceryWebStore;
    
    logger.info('JSON data read from file:', jsonData);
    return jsonData;
}

async function getGroceryDiscounts(config: IGroceryWebStore): Promise<GroceryDiscounts> {
    const groceryClient = new GroceryClient();
    const productDiscounts: IProductDiscount[] = [];

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
            const productDiscountDetails: IProductDiscount = await groceryClient.getDiscountProductDetails(discountProduct, config.webIdentifiers.promotionProducts);
            productDiscounts.push(productDiscountDetails);
        }
        logger.info(`Discount details are scraped and stored.`);
    }

    // Close the grocery client (e.g., close browser instance, clear resources)
    await groceryClient.close();

    // Use JsonWriter to write the ProductDiscount details to a JSON file
    return new GroceryDiscounts(config.name, productDiscounts);
}

async function flushNotionDiscountPage(groceryDiscountsFilePath: string): Promise<void> {
    // Use the NotionClient to set the ProductDiscount details to a Notion page
    const integrationToken = getEnvVariable('NOTION_SECRET');
    const databaseId = getEnvVariable('DISCOUNT_PAGE_ID');
    const groceryDiscountsSchemaFilePath = getEnvVariable('GROCERY_DISCOUNTS_SCHEMA');

    const jsonReader = new JsonReader(groceryDiscountsSchemaFilePath, groceryDiscountsFilePath);
    const jsonData = await jsonReader.read() as IGroceryDiscounts;

    const notionClient = new NotionClient(integrationToken, databaseId);
    
    // Use the instance of the converter and use it and transform the type
    const pageBlocks = new NotionPageConverter().getPageBlocks(jsonData) as BlockObjectRequest[]
    notionClient.flushPage(pageBlocks);
}

async function discountScraper(): Promise<void> {
    const groceryConfig = await getConfig();

    const groceryDiscounts = await getGroceryDiscounts(groceryConfig)
    
    if (groceryDiscounts.discounts.length > 0) {
        const jsonWriter = new JsonWriter(`./export/${groceryConfig.name}_${DateTimeHandler.getDateTimeShort()}.json`);
        await jsonWriter.write(groceryDiscounts);

        // await flushNotionDiscountPage(jsonWriter.getFilePath());
    } else {
        logger.error('No discounts found or could not retrieve discounts.');
        process.exit(1);
    }

    logger.info('Discount scraper process has been completed.')
}

discountScraper();