import { logger } from "./utils/Logger";
import { ElementHandle } from "playwright";
import NotionDatabaseClient from "./clients/database/NotionDatabaseClient";
import JsonDataManager from "./data/JsonDataManager";
import {
  getConfig,
  getEnvVariable,
  getSupermarketClient,
} from "./utils/ConfigHelper";
import DateTimeHandler from "./utils/DateTimeHandler";
import NotionDatabaseService from "./service/NotionDatabaseService";

require("dotenv").config();

const jsonDataManager = new JsonDataManager();

async function getSupermarketDiscounts(
  config: ISupermarketWebConfig
): Promise<IProductDiscountDetails[]> {
  const supermarketClient = getSupermarketClient(config.name);
  let productDiscountDetails: IProductDiscountDetails[] = [];

  await supermarketClient.init();
  await supermarketClient.navigate(config.url);
  await supermarketClient.handleCookiePopup(
    config.webIdentifiers.cookieDecline
  );
  await supermarketClient.getPromotionExpireDate(
    config.webIdentifiers.promotionExpireDate
  );

  // Iterate over each product category defined in the supermarket's configuration
  for (const productCategory of config.webIdentifiers.productCategories) {
    // Get the products listed under the current category that are on discount
    const discountProducts: ElementHandle[] | undefined =
      await supermarketClient.getDiscountProductsByProductCategory(
        productCategory,
        config.webIdentifiers.products
      );

    if (!discountProducts) {
      logger.error(
        `No discount products for product category '${productCategory}'.`
      );
      continue;
    }

    // For each discount product found, get its details and append it to the supermarketDiscounts
    for (const discountProduct of discountProducts) {
      const details: IProductDiscountDetails =
        await supermarketClient.getDiscountProductDetails(
          discountProduct,
          config.webIdentifiers.promotionProducts
        );
      productDiscountDetails.push(details);
    }
    logger.info(`Discount details are scraped and stored.`);
  }

  // Close the supermarket client (e.g., close browser instance, clear resources)
  await supermarketClient.close();

  // Use JsonWriter to write the ProductDiscount details to a JSON file
  return productDiscountDetails;
}

async function flushNotionDatabaseBySupermarket(
  supermarket: string
): Promise<void> {
  // Use the NotionDatabaseClient to set the ProductDiscount details to a Notion database
  const integrationToken = getEnvVariable("NOTION_SECRET");
  const databaseId = getEnvVariable("NOTION_DATABASE_ID");
  
  // Initialize the Notion client and service
  const databaseClient = new NotionDatabaseClient(integrationToken, databaseId);
  const databaseService = new NotionDatabaseService(databaseClient);

  const notion = new NotionDatabaseClient(integrationToken, databaseId);
  const supermarketFilter = {
    property: "Supermarket",
    select: {
      equals: supermarket,
    },
  };;

  // Construct a IProductDiscountDetails object from the JsonDataContext
  const productDiscounts: IProductDiscountDetails[] =
    await jsonDataManager.getSupermarketDiscountsVerbose(supermarket);

  // Convert product discounts to database entries
  const productDiscountEntries = databaseService.toDatabaseEntries(productDiscounts);
  logger.info(
    `Converted product discounts to ${productDiscountEntries.length} new database entries.`
  );

  if (productDiscountEntries.length > 0) {
    await notion.flushDatabase(productDiscountEntries, supermarketFilter);
    logger.info("Discounts are added to Notion database.");
  } else {
    logger.error("No discounts found to add to Notion.");
  }
}

async function setupScheduler(supermarket: string, shortName: string): Promise<void> {
  logger.info(`Setup scheduler for "${supermarket}".`);

  const expireDate = await jsonDataManager.getSupermarketExpireDate(supermarket);
  // Set scheduler at 04:00 in the morning
  const scheduleDay = DateTimeHandler.addToISOString(expireDate, 1, "days");
  const scheduleDateTime = DateTimeHandler.addToISOString(scheduleDay, 4, "hours");
  const dateTime = DateTimeHandler.fromISOToDateTimeString(scheduleDateTime, "YYYY-MM-DD HH:mm:ss");

  const { exec } = require('child_process');
  await exec(`bash ./scripts/schedule.sh "${shortName}" "${dateTime}"`, (err: string, stdout: string, stderr: string) => {
    if (err) {
      logger.error("[EXEC ERR]", err);
      return;
    }
    if (stderr) {
      logger.warn("[STDERR]", stderr);
      return;
    }
    logger.info("[STDOUT]", stdout);
  });
}

async function discountScraper(): Promise<void> {
  logger.info("Discount scraper process has started!");

  logger.info("Get the configuration details.");
  const supermarketConfig: ISupermarketWebConfig = await getConfig();

  const supermarketDiscounts: IProductDiscountDetails[] =
    await getSupermarketDiscounts(supermarketConfig);

  await jsonDataManager.deleteRecordsBySupermarket(supermarketConfig.name);
  await jsonDataManager.addProductDb(supermarketConfig.name, supermarketDiscounts);
  await jsonDataManager.addDiscountDb(supermarketDiscounts);

  await flushNotionDatabaseBySupermarket(supermarketConfig.name);

  await setupScheduler(supermarketConfig.name, supermarketConfig.nameShort);

  logger.info("Discount scraper process has stopped!");
}

discountScraper();
