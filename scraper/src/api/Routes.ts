import { Request, Response, Router } from "express";
import { serverLogger, scraperLogger } from "../utils/Logger";
import { Locator } from "playwright";
import PostgresDataManager from "../data/PostgresDataManager";
import { getSupermarketClient } from "../utils/ConfigHelper";

const router = Router();

// Create a single shared instance of PostgresDataManager
const dataManager = new PostgresDataManager();

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
  config: ISupermarketWebConfig,
  supermarketClient: any
): Promise<{
  discounts: IProductDiscountDetails[];
  expireDate: string;
}> {
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

  const expireDate = supermarketClient.getExpireDate();

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
  return { discounts: productDiscountDetails, expireDate };
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

    // Get total scraped products (with active discounts)
    const scrapedProductsQuery = `
      SELECT COUNT(*) as count
      FROM discounts
      WHERE active = true
    `;
    const scrapedProductsResult = await dbContext.query(scrapedProductsQuery);
    const scrapedProducts = parseInt(scrapedProductsResult.rows[0].count, 10);

    // Get run statistics from scraper_runs table
    const scraperRunController = dataManager.getScraperRunController();
    const runStats = await scraperRunController.getRunStats();

    // Get next scheduled run
    const scheduledRunController = dataManager.getScheduledRunController();
    const scheduledRuns =
      await scheduledRunController.getEnabledScheduledRuns();
    let nextScheduledRun = "Not scheduled";

    if (scheduledRuns.length > 0) {
      // Find the earliest scheduled run
      const earliestRun = scheduledRuns.reduce((earliest, current) =>
        current.nextRunAt < earliest.nextRunAt ? current : earliest
      );
      nextScheduledRun = `${
        earliestRun.supermarket
      } at ${earliestRun.nextRunAt.toLocaleString()}`;
    }

    const stats = {
      totalRuns: runStats.totalRuns,
      successRate: runStats.successRate,
      scrapedProducts,
      uniqueProducts,
      nextScheduledRun,
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
  try {
    serverLogger.info("Fetching supermarket statuses");

    const dbContext = (dataManager as any).db;
    const scraperRunController = dataManager.getScraperRunController();

    // Get last update and product count for each supermarket
    const query = `
      SELECT 
        p.supermarket,
        MAX(p.updated_at) as last_run,
        COUNT(DISTINCT p.id) as products_scraped
      FROM products p
      INNER JOIN discounts d ON p.id = d.product_id
      WHERE d.active = true
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

    const statuses = await Promise.all(
      allSupermarkets.map(async (sm) => {
        const dbRow = result.rows.find(
          (row: any) => row.supermarket === sm.name
        );
        const lastRun = await scraperRunController.getLastRunBySupermarket(
          sm.name
        );

        if (dbRow && lastRun) {
          return {
            key: sm.key,
            name: sm.name,
            status: lastRun.status as "success" | "failed" | "running",
            lastRun: lastRun.completedAt || lastRun.startedAt,
            productsScraped: parseInt(dbRow.products_scraped, 10),
            runId: lastRun.id,
          };
        } else if (lastRun) {
          return {
            key: sm.key,
            name: sm.name,
            status: lastRun.status as "success" | "failed" | "running",
            lastRun: lastRun.completedAt || lastRun.startedAt,
            productsScraped: 0,
            runId: lastRun.id,
          };
        } else {
          return {
            key: sm.key,
            name: sm.name,
            status: "pending" as const,
          };
        }
      })
    );

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
  try {
    serverLogger.info("Fetching all active discounts with product details");

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
          'active', d.active,
          'created_at', d.created_at,
          'updated_at', d.updated_at
        ) as discount
      FROM products p
      INNER JOIN discounts d ON p.id = d.product_id
      WHERE d.active = true
      ORDER BY d.expire_date ASC, p.category ASC, p.name ASC
    `;

    const dbContext = (dataManager as any).db;
    const result = await dbContext.query(query);

    serverLogger.info(`Retrieved ${result.rows.length} active discounts`);

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
    let runId: number | null = null;

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

      // Create scraper run record
      const scraperRunController = dataManager.getScraperRunController();
      runId = await scraperRunController.createRun(supermarketName);
      scraperLogger.info(`Scraper run tracked with ID: ${runId}`);

      // Get configuration from database
      scraperLogger.info("Fetching supermarket configuration from database");
      const supermarketConfig = await getConfigFromDatabase(
        dataManager,
        supermarketName
      );
      scraperLogger.info("Configuration loaded successfully");

      // Scrape discounts
      const supermarketClient = getSupermarketClient(supermarketName);
      const { discounts: supermarketDiscounts, expireDate } =
        await getSupermarketDiscounts(supermarketConfig, supermarketClient);

      // Parse the expiration date
      const promotionExpireDate = expireDate ? new Date(expireDate) : undefined;

      // Update database
      scraperLogger.info("Updating database with scraped data");
      const discountsDeactivated = await dataManager.deleteRecordsBySupermarket(
        supermarketConfig.name
      );
      scraperLogger.info("Old discounts deactivated");

      const productMetrics = await dataManager.addProductDb(
        supermarketConfig.name,
        supermarketDiscounts
      );
      scraperLogger.info("Products upserted to database");

      const discountsCreated = await dataManager.addDiscountDb(
        supermarketDiscounts
      );
      scraperLogger.info("New discounts added to database");

      // Update scraper run to success
      await scraperRunController.updateRunSuccess(runId, {
        productsScraped: supermarketDiscounts.length,
        productsUpdated: productMetrics.updated,
        productsCreated: productMetrics.created,
        discountsDeactivated,
        discountsCreated,
        promotionExpireDate,
      });

      // Create/update scheduled run for next scrape
      if (promotionExpireDate) {
        const scheduledRunController = dataManager.getScheduledRunController();
        await scheduledRunController.upsertScheduledRun(
          supermarketName,
          promotionExpireDate,
          true
        );
        scraperLogger.info(
          `Scheduled next run for ${supermarketName} based on promotion expiry: ${promotionExpireDate}`
        );
      }

      scraperLogger.info(`=== Scraper session completed successfully ===`);
      serverLogger.info(
        `Scraper completed for "${supermarketName}" - ${supermarketDiscounts.length} products scraped`
      );

      res.status(200).json({
        success: true,
        message: `Scraper completed for ${supermarketName}`,
        data: {
          runId,
          supermarket: supermarketConfig.name,
          productsScraped: supermarketDiscounts.length,
          productsCreated: productMetrics.created,
          productsUpdated: productMetrics.updated,
          discountsDeactivated,
          discountsCreated,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";

      // Update scraper run to failed if we have a runId
      if (runId) {
        try {
          const scraperRunController = dataManager.getScraperRunController();
          await scraperRunController.updateRunFailure(runId, errorMessage);
        } catch (updateError) {
          scraperLogger.error(
            "Failed to update scraper run status:",
            updateError
          );
        }
      }

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

// Get all scraper runs
router.get("/scraper/runs", async (req: Request, res: Response) => {
  try {
    serverLogger.info("Fetching all scraper runs");

    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 100;
    const scraperRunController = dataManager.getScraperRunController();
    const runs = await scraperRunController.getAllRuns(limit);

    serverLogger.info(`Retrieved ${runs.length} scraper runs`);
    res.status(200).json(runs);
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    serverLogger.error(`Error fetching scraper runs: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Get scraper runs for a specific supermarket
router.get(
  "/scraper/runs/:supermarket",
  async (req: Request, res: Response) => {
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

      serverLogger.info(`Fetching scraper runs for "${supermarketName}"`);

      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 50;
      const scraperRunController = dataManager.getScraperRunController();
      const runs = await scraperRunController.getRunsBySupermarket(
        supermarketName,
        limit
      );

      serverLogger.info(
        `Retrieved ${runs.length} scraper runs for ${supermarketName}`
      );
      res.status(200).json(runs);
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      serverLogger.error(`Error fetching scraper runs: ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
);

// Get specific scraper run by ID
router.get("/scraper/run/:id", async (req: Request, res: Response) => {
  try {
    const runId = parseInt(req.params.id, 10);

    if (isNaN(runId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid run ID",
      });
    }

    serverLogger.info(`Fetching scraper run with ID: ${runId}`);

    const scraperRunController = dataManager.getScraperRunController();
    const run = await scraperRunController.getRunById(runId);

    if (!run) {
      return res.status(404).json({
        success: false,
        error: "Scraper run not found",
      });
    }

    serverLogger.info(`Retrieved scraper run ${runId}`);
    res.status(200).json(run);
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    serverLogger.error(`Error fetching scraper run: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Get all scheduled runs
router.get("/scheduler/runs", async (req: Request, res: Response) => {
  try {
    serverLogger.info("Fetching all scheduled runs");

    const scheduledRunController = dataManager.getScheduledRunController();
    const scheduledRuns = await scheduledRunController.getAllScheduledRuns();

    serverLogger.info(`Retrieved ${scheduledRuns.length} scheduled runs`);
    res.status(200).json(scheduledRuns);
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    serverLogger.error(`Error fetching scheduled runs: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// Get scheduled run for specific supermarket
router.get(
  "/scheduler/run/:supermarket",
  async (req: Request, res: Response) => {
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

      serverLogger.info(`Fetching scheduled run for "${supermarketName}"`);

      const scheduledRunController = dataManager.getScheduledRunController();
      const scheduledRun = await scheduledRunController.getScheduledRun(
        supermarketName
      );

      if (!scheduledRun) {
        return res.status(404).json({
          success: false,
          error: `No scheduled run found for ${supermarketName}`,
        });
      }

      serverLogger.info(`Retrieved scheduled run for ${supermarketName}`);
      res.status(200).json(scheduledRun);
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      serverLogger.error(`Error fetching scheduled run: ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
);

// Toggle scheduled run for a supermarket
router.put(
  "/scheduler/toggle/:supermarket",
  async (req: Request, res: Response) => {
    try {
      const supermarketParam = req.params.supermarket.toLowerCase();
      const { enabled } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "enabled field must be a boolean",
        });
      }

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

      serverLogger.info(
        `Toggling scheduled run for "${supermarketName}" to ${enabled}`
      );

      const scheduledRunController = dataManager.getScheduledRunController();
      const success = await scheduledRunController.toggleScheduledRun(
        supermarketName,
        enabled
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: `No scheduled run found for ${supermarketName}`,
        });
      }

      serverLogger.info(
        `Scheduled run for ${supermarketName} toggled to ${enabled}`
      );
      res.status(200).json({
        success: true,
        message: `Scheduled run for ${supermarketName} ${
          enabled ? "enabled" : "disabled"
        }`,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Unknown error";
      serverLogger.error(`Error toggling scheduled run: ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }
);

// Get due scheduled runs (for internal scheduler use)
router.get("/scheduler/due", async (req: Request, res: Response) => {
  try {
    serverLogger.info("Fetching due scheduled runs");

    const scheduledRunController = dataManager.getScheduledRunController();
    const dueRuns = await scheduledRunController.getDueScheduledRuns();

    serverLogger.info(`Retrieved ${dueRuns.length} due scheduled runs`);
    res.status(200).json(dueRuns);
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    serverLogger.error(`Error fetching due scheduled runs: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
