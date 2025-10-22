import { logger } from "./utils/Logger";
import { ElementHandle } from "puppeteer";
import PostgresDataManager from "./data/PostgresDataManager";
import {
  getConfig,
  getEnvVariable,
  getSupermarketClient,
} from "./utils/ConfigHelper";
import DateTimeHandler from "./utils/DateTimeHandler";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from project root (two levels up from this file)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const dataManager = new PostgresDataManager();

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

async function setupScheduler(
  supermarket: string,
  shortName: string
): Promise<void> {
  logger.info(`Setup scheduler for "${supermarket}".`);

  const expireDate = await dataManager.getSupermarketExpireDate(supermarket);
  // Set scheduler at 04:00 in the morning
  const scheduleDay = DateTimeHandler.addToISOString(expireDate, 1, "days");
  const scheduleDateTime = DateTimeHandler.addToISOString(
    scheduleDay,
    4,
    "hours"
  );
  const dateTime = DateTimeHandler.fromISOToDateTimeString(
    scheduleDateTime,
    "YYYY-MM-DD HH:mm:ss"
  );

  const { exec } = require("child_process");
  await exec(
    `bash ./scripts/schedule.sh "${shortName}" "${dateTime}"`,
    (err: string, stdout: string, stderr: string) => {
      if (err) {
        logger.error("[EXEC ERR]", err);
        return;
      }
      if (stderr) {
        logger.warn("[STDERR]", stderr);
        return;
      }
      logger.info("[STDOUT]", stdout);
    }
  );
}

async function discountScraper(): Promise<void> {
  logger.info("Discount scraper process has started!");

  try {
    // Test database connection
    const connected = await dataManager.testConnection();
    if (!connected) {
      logger.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    logger.info("Get the configuration details.");
    const supermarketConfig: ISupermarketWebConfig = await getConfig();

    const supermarketDiscounts: IProductDiscountDetails[] =
      await getSupermarketDiscounts(supermarketConfig);

    await dataManager.deleteRecordsBySupermarket(supermarketConfig.name);
    await dataManager.addProductDb(
      supermarketConfig.name,
      supermarketDiscounts
    );
    await dataManager.addDiscountDb(supermarketDiscounts);

    // await flushNotionDatabaseBySupermarket(supermarketConfig.name);

    // await setupScheduler(supermarketConfig.name, supermarketConfig.nameShort);

    logger.info("Discount scraper process has stopped!");
  } catch (error) {
    logger.error("Error during discount scraping:", error);
    process.exit(1);
  } finally {
    await dataManager.close();
  }
}

discountScraper();
