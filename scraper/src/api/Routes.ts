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

// Get dashboard statistics
router.get("/dashboard/stats", async (req: Request, res: Response) => {
  const dataManager = new PostgresDataManager();

  try {
    serverLogger.info("Fetching dashboard statistics");

    const dbContext = (dataManager as any).db;

    // Get total unique products
    const uniqueProductsQuery = `
      SELECT COUNT(DISTINCT id) as count
      FROM products
    `;
    const uniqueProductsResult = await dbContext.query(uniqueProductsQuery);
    const uniqueProducts = parseInt(uniqueProductsResult.rows[0].count, 10);

    // Get total scraped products (with discounts)
    const scrapedProductsQuery = `
      SELECT COUNT(*) as count
      FROM discounts
    `;
    const scrapedProductsResult = await dbContext.query(scrapedProductsQuery);
    const scrapedProducts = parseInt(scrapedProductsResult.rows[0].count, 10);

    // For now, we'll use placeholder values for totalRuns and successRate
    // In a real scenario, you'd track these in a separate runs/logs table
    const stats = {
      totalRuns: 0,
      successRate: 0,
      scrapedProducts,
      uniqueProducts,
      nextScheduledRun: "Not scheduled", // This would come from your scheduler
    };

    serverLogger.info("Dashboard statistics retrieved successfully");
    res.status(200).json(stats);
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    serverLogger.error(`Error fetching dashboard stats: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Get supermarket statuses
router.get("/dashboard/statuses", async (req: Request, res: Response) => {
  const dataManager = new PostgresDataManager();

  try {
    serverLogger.info("Fetching supermarket statuses");

    const dbContext = (dataManager as any).db;

    // Get last update and product count for each supermarket
    const query = `
      SELECT 
        p.supermarket,
        MAX(p.updated_at) as last_run,
        COUNT(DISTINCT p.id) as products_scraped
      FROM products p
      INNER JOIN discounts d ON p.id = d.product_id
      GROUP BY p.supermarket
      ORDER BY p.supermarket
    `;

    const result = await dbContext.query(query);

    // Map supermarket names to keys
    const nameToKeyMap: { [key: string]: string } = {
      "Albert Heijn": "albert-heijn",
      Dirk: "dirk",
      PLUS: "plus",
    };

    // Define all supermarkets
    const allSupermarkets = [
      { key: "albert-heijn", name: "Albert Heijn" },
      { key: "dirk", name: "Dirk" },
      { key: "plus", name: "PLUS" },
    ];

    const statuses = allSupermarkets.map((sm) => {
      const dbRow = result.rows.find((row: any) => row.supermarket === sm.name);

      if (dbRow) {
        return {
          key: sm.key,
          name: sm.name,
          status: "success" as const,
          lastRun: dbRow.last_run,
          productsScraped: parseInt(dbRow.products_scraped, 10),
        };
      } else {
        return {
          key: sm.key,
          name: sm.name,
          status: "pending" as const,
        };
      }
    });

    serverLogger.info("Supermarket statuses retrieved successfully");
    res.status(200).json(statuses);
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    serverLogger.error(`Error fetching supermarket statuses: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Get all discounts with product details
router.get("/discounts", async (req: Request, res: Response) => {
  const dataManager = new PostgresDataManager();

  try {
    serverLogger.info("Fetching all discounts with product details");

    const query = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.supermarket,
        p.created_at,
        p.updated_at,
        json_build_object(
          'id', d.id,
          'product_id', d.product_id,
          'original_price', d.original_price,
          'discount_price', d.discount_price,
          'special_discount', d.special_discount,
          'expire_date', d.expire_date,
          'created_at', d.created_at,
          'updated_at', d.updated_at
        ) as discount
      FROM products p
      INNER JOIN discounts d ON p.id = d.product_id
      ORDER BY d.expire_date ASC, p.category ASC, p.name ASC
    `;

    const dbContext = (dataManager as any).db;
    const result = await dbContext.query(query);

    serverLogger.info(`Retrieved ${result.rows.length} discounts`);

    res.status(200).json(result.rows);
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    serverLogger.error(`Error fetching discounts: ${errorMessage}`);

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
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
