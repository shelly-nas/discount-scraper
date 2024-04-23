import ArgumentHandler from "./utils/ArgumentHandler";
import DateTimeHandler from "./utils/DateTimeHandler";
import JsonReader from "./utils/JsonReader";
import JsonWriter from "./utils/JsonWriter";
import NotionConverter from "./utils/NotionConverter";
import GroceryClient from "./clients/web/GroceryClient";
import NotionPageClient from "./clients/notion/NotionPageClient";
import { logger } from "./utils/Logger";
import { GroceryDiscountsModel } from "./models/GroceryDiscountsModel";
import { ElementHandle } from "playwright";
import process from "process";
import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import AhClient from "./clients/web/AhClient";
import DirkClient from "./clients/web/DirkClient";
import PlusClient from "./clients/web/PlusClient";
import NotionDatabaseClient from "./clients/notion/NotionDatabaseClient";
require("dotenv").config();

function getEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    logger.error(`The ${name} environment variable is not set.`);
    process.exit(1);
  }
  return value;
}

async function getConfig(): Promise<IGroceryWebStore> {
  const groceryWebStoreSchemaFilePath = getEnvVariable("GROCERY_SCHEMA");
  const argHandler = new ArgumentHandler(process.argv);
  const configPath = argHandler.getArgByFlag("--config");

  const jsonReader = new JsonReader(groceryWebStoreSchemaFilePath, configPath);
  const jsonData = (await jsonReader.read()) as IGroceryWebStore;

  logger.info("JSON data read from file:", jsonData);
  return jsonData;
}

function createGroceryClient(configName: string): GroceryClient {
  switch (configName) {
    case "Albert-Heijn":
      return new AhClient();
    case "Dirk":
      return new DirkClient();
    case "PLUS":
      return new PlusClient();
    default:
      logger.error(
        "Descendent of Grocery Client could not be found or instantiated."
      );
      process.exit(1);
  }
}

async function getGroceryDiscounts(
  config: IGroceryWebStore
): Promise<GroceryDiscountsModel> {
  const groceryClient = createGroceryClient(config.name);
  const productDiscounts: IProductDiscount[] = [];

  await groceryClient.init();
  await groceryClient.navigate(config.url);
  await groceryClient.handleCookiePopup(config.webIdentifiers.cookieDecline);

  // Iterate over each product category defined in the grocery store's configuration
  for (const productCategory of config.webIdentifiers.productCategories) {
    // Get the products listed under the current category that are on discount
    const discountProducts: ElementHandle[] | undefined =
      await groceryClient.getDiscountProductsByProductCategory(
        productCategory,
        config.webIdentifiers.products
      );

    if (!discountProducts) {
      logger.error(
        `No discount products for product category '${productCategory}'.`
      );
      break;
    }

    // For each discount product found, get its details and append it to the groceryDiscounts
    for (const discountProduct of discountProducts) {
      const productDiscountDetails: IProductDiscount =
        await groceryClient.getDiscountProductDetails(
          discountProduct,
          config.webIdentifiers.promotionProducts
        );
      productDiscounts.push(productDiscountDetails);
    }
    logger.info(`Discount details are scraped and stored.`);
  }

  // Close the grocery client (e.g., close browser instance, clear resources)
  await groceryClient.close();

  // Use JsonWriter to write the ProductDiscount details to a JSON file
  return new GroceryDiscountsModel(config.name, productDiscounts);
}

async function flushNotionDiscountDatabase(
  groceryDiscountsFilePath: string, groceryName: string
): Promise<void> {
  // Use the NotionDatabaseClient to set the ProductDiscount details to a Notion database
  const integrationToken = getEnvVariable("NOTION_SECRET");
  const databaseId = getEnvVariable("NOTION_DATABASE_ID");
  const groceryDiscountsSchemaFilePath = getEnvVariable(
    "GROCERY_DISCOUNTS_SCHEMA"
  );

  const jsonReader = new JsonReader(
    groceryDiscountsSchemaFilePath,
    groceryDiscountsFilePath
  );
  const jsonData = (await jsonReader.read()) as IGroceryDiscounts;

  const notion = new NotionDatabaseClient(integrationToken, databaseId);

  const propertyFilter = new NotionConverter().querySupermarket(groceryName)

  await notion.flushDatabase(jsonData, propertyFilter)

  // Use the instance of the converter and use it and transform the type
}

async function discountScraper(): Promise<void> {
  const groceryConfig = await getConfig();

  const groceryDiscounts = await getGroceryDiscounts(groceryConfig);

  const jsonWriter = new JsonWriter(
    `./export/${groceryConfig.name}_${DateTimeHandler.getDateTimeShort()}.json`
  );
  await jsonWriter.write(groceryDiscounts);

  if (groceryDiscounts.discounts.length > 0) {
    await flushNotionDiscountDatabase(jsonWriter.getFilePath(), groceryConfig.name);
    logger.info("Discounts are added to Notion database.");
  } else {
    logger.error("No discounts found to add to Notion.");
  }

  logger.info("Discount scraper process has been completed.");
}

discountScraper();
