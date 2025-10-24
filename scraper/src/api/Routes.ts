import { Request, Response, Router } from "express";
import { serverLogger, scraperLogger } from "../utils/Logger";
import { Locator } from "playwright";
import PostgresDataManager from "../data/PostgresDataManager";
import { getSupermarketClient } from "../utils/ConfigHelper";

const router = Router();

// Helper function to get config from database
async function getConfigFromDatabase(
  dataManager: PostgresDataManager,
  supermarketName: string
): Promise<ISupermarketWebConfig> {
  const query = `
    SELECT name, name_short, url, web_identifiers
    FROM supermarket_configs
    WHERE name = $1
  `;

  const dbContext = (dataManager as any).db;
  const result = await dbContext.query(query, [supermarketName]);

  if (result.rows.length === 0) {
    throw new Error(`No config found for supermarket: ${supermarketName}`);
  }

  const row = result.rows[0];
  return {
    name: row.name,
    nameShort: row.name_short,
    url: row.url,
    webIdentifiers: row.web_identifiers,
  };
}

// Helper function to scrape supermarket discounts
async function getSupermarketDiscounts(
  config: ISupermarketWebConfig
): Promise<IProductDiscountDetails[]> {
  const supermarketClient = getSupermarketClient(config.name);
  let productDiscountDetails: IProductDiscountDetails[] = [];

  scraperLogger.info(`Initializing scraper for ${config.name}`);
  await supermarketClient.init();

  scraperLogger.info(`Navigating to ${config.url}`);
  await supermarketClient.navigate(config.url);

  scraperLogger.info(`Handling cookie popup`);
  await supermarketClient.handleCookiePopup(
    config.webIdentifiers.cookieDecline
  );

  scraperLogger.info(`Getting promotion expiry date`);
  await supermarketClient.getPromotionExpireDate(
    config.webIdentifiers.promotionExpireDate
  );

  for (const productCategory of config.webIdentifiers.productCategories) {
    scraperLogger.info(`Processing product category: ${productCategory}`);

    const discountProducts: Locator[] | undefined =
      await supermarketClient.getDiscountProductsByProductCategory(
        productCategory,
        config.webIdentifiers.products
      );

    if (!discountProducts) {
      scraperLogger.error(
        `No discount products found for category '${productCategory}'`
      );
      continue;
    }

    scraperLogger.info(
      `Found ${discountProducts.length} discount products in category '${productCategory}'`
    );

    for (const discountProduct of discountProducts) {
      const details: IProductDiscountDetails =
        await supermarketClient.getDiscountProductDetails(
          discountProduct,
          config.webIdentifiers.promotionProducts
        );
      productDiscountDetails.push(details);
      scraperLogger.debug(`Scraped product: ${details.name}`);
    }
    scraperLogger.info(
      `Completed scraping ${productDiscountDetails.length} products from category '${productCategory}'`
    );
  }

  scraperLogger.info(
    `Total products scraped: ${productDiscountDetails.length}`
  );
  await supermarketClient.close();
  return productDiscountDetails;
}

// Health check endpoint
router.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Run scraper endpoint
router.post(
  "/scraper/run/:supermarket",
  async (req: Request, res: Response) => {
    const dataManager = new PostgresDataManager();

    try {
      const supermarketParam = req.params.supermarket.toLowerCase();

      // Map URL params to full supermarket names
      const nameMap: { [key: string]: string } = {
        "albert-heijn": "Albert Heijn",
        dirk: "Dirk",
        plus: "PLUS",
      };

      const supermarketName = nameMap[supermarketParam];

      if (!supermarketName) {
        serverLogger.warn(
          `Invalid supermarket parameter: ${req.params.supermarket}`
        );
        return res.status(400).json({
          success: false,
          error: `Unknown supermarket: ${req.params.supermarket}. Valid values: albert-heijn, dirk, plus`,
        });
      }

      serverLogger.info(`Starting scraper for "${supermarketName}"`);

      // Initialize scraper logger with supermarket name
      scraperLogger.setSupermarket(supermarketName);
      scraperLogger.info(
        `=== Scraper session started for ${supermarketName} ===`
      );

      // Test database connection
      const connected = await dataManager.testConnection();
      if (!connected) {
        throw new Error("Failed to connect to database");
      }
      scraperLogger.info("Database connection verified");

      // Get configuration from database
      scraperLogger.info("Fetching supermarket configuration from database");
      const supermarketConfig = await getConfigFromDatabase(
        dataManager,
        supermarketName
      );
      scraperLogger.info("Configuration loaded successfully");

      // Scrape discounts
      const supermarketDiscounts = await getSupermarketDiscounts(
        supermarketConfig
      );

      // Update database
      scraperLogger.info("Updating database with scraped data");
      await dataManager.deleteRecordsBySupermarket(supermarketConfig.name);
      scraperLogger.info("Old records deleted");

      await dataManager.addProductDb(
        supermarketConfig.name,
        supermarketDiscounts
      );
      scraperLogger.info("Products added to database");

      await dataManager.addDiscountDb(supermarketDiscounts);
      scraperLogger.info("Discounts added to database");

      scraperLogger.info(`=== Scraper session completed successfully ===`);
      serverLogger.info(
        `Scraper completed for "${supermarketName}" - ${supermarketDiscounts.length} products scraped`
      );

      res.status(200).json({
        success: true,
        message: `Scraper completed for ${supermarketName}`,
        data: {
          supermarket: supermarketConfig.name,
          productsScraped: supermarketDiscounts.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";

      if (scraperLogger) {
        scraperLogger.error("Error during scraping:", error);
        scraperLogger.error(`=== Scraper session failed ===`);
      }

      serverLogger.error(
        `Scraper failed for "${req.params.supermarket}": ${errorMessage}`
      );

      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
    // Don't close the pool - it's a singleton that should stay open
  }
);

export default router;
