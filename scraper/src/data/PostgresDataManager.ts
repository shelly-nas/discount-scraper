import PostgresDiscountController from "../controllers/PostgresDiscountController";
import PostgresProductController from "../controllers/PostgresProductController";
import PostgresScraperRunController from "../controllers/PostgresScraperRunController";
import { scraperLogger } from "../utils/Logger";
import PostgresDataContext from "./PostgresDataContext";
import { getDatabaseConfig } from "../config/database";

export class PostgresDataManager {
  private productController: PostgresProductController;
  private discountController: PostgresDiscountController;
  private scraperRunController: PostgresScraperRunController;
  public db: PostgresDataContext;

  constructor() {
    const config = getDatabaseConfig();
    this.db = PostgresDataContext.getInstance(config);

    this.productController = new PostgresProductController(this.db);
    this.discountController = new PostgresDiscountController(this.db);
    this.scraperRunController = new PostgresScraperRunController(this.db);

    scraperLogger.info("PostgresDataManager initialized.");
  }

  public getProductController(): PostgresProductController {
    return this.productController;
  }

  public getDiscountController(): PostgresDiscountController {
    return this.discountController;
  }

  public getScraperRunController(): PostgresScraperRunController {
    return this.scraperRunController;
  }

  public async testConnection(): Promise<boolean> {
    return await this.db.testConnection();
  }

  public async addProductDb(
    supermarket: string,
    products: IProductDiscountDetails[]
  ): Promise<{ created: number; updated: number }> {
    scraperLogger.debug("Add to Product database.");

    // Deduplicate products by name - keep first occurrence
    const uniqueProducts = new Map<string, IProductDiscountDetails>();
    for (const product of products) {
      if (!uniqueProducts.has(product.name)) {
        uniqueProducts.set(product.name, product);
      } else {
        scraperLogger.debug(
          `Duplicate product '${product.name}' found in scraped data. Using first occurrence.`
        );
      }
    }

    let created = 0;
    let updated = 0;

    const uniqueProductArray = Array.from(uniqueProducts.values());
    for (const product of uniqueProductArray) {
      const result = await this.productController.addProductWithTracking(
        product.name,
        product.category,
        supermarket
      );
      if (result.wasCreated) {
        created++;
      } else {
        updated++;
      }
    }
    scraperLogger.info(
      `Processed '${uniqueProductArray.length}' unique products: ${created} created, ${updated} updated (from ${products.length} scraped items).`
    );

    return { created, updated };
  }

  public async addDiscountDb(
    discounts: IProductDiscountDetails[]
  ): Promise<number> {
    scraperLogger.debug("Add to Discount database.");

    // Deduplicate discounts by product name - keep first occurrence
    const uniqueDiscounts = new Map<string, IProductDiscountDetails>();
    for (const discount of discounts) {
      if (!uniqueDiscounts.has(discount.name)) {
        uniqueDiscounts.set(discount.name, discount);
      } else {
        scraperLogger.debug(
          `Duplicate discount for '${discount.name}' found in scraped data. Using first occurrence.`
        );
      }
    }

    let discountsCreated = 0;

    const uniqueDiscountArray = Array.from(uniqueDiscounts.values());
    for (const discount of uniqueDiscountArray) {
      const productId = await this.productController.getProductId(
        discount.name
      );

      if (productId === -1) {
        scraperLogger.warn(
          `Product '${discount.name}' not found. Skipping discount.`
        );
        continue;
      }

      await this.discountController.addDiscount(
        productId,
        discount.originalPrice,
        discount.discountPrice,
        discount.specialDiscount,
        discount.expireDate
      );
      discountsCreated++;
    }
    scraperLogger.info(
      `Added '${discountsCreated}' unique discounts to Discount Database (from ${discounts.length} scraped items).`
    );

    return discountsCreated;
  }

  public async getSupermarketDiscountsVerbose(
    supermarket: string
  ): Promise<IProductDiscountDetails[]> {
    scraperLogger.debug(
      "Combine databases to create a ProductDiscountDetails structure."
    );

    try {
      const products = await this.productController.getProductsBySupermarket(
        supermarket
      );
      const productDiscounts: IProductDiscountDetails[] = [];

      for (const product of products) {
        const discounts = await this.discountController.getDiscountsByProductId(
          product.id
        );

        for (const discount of discounts) {
          const details: IProductDiscountDetails = {
            name: product.name,
            originalPrice: discount.originalPrice,
            discountPrice: discount.discountPrice,
            specialDiscount: discount.specialDiscount,
            category: product.category,
            supermarket: product.supermarket,
            expireDate: discount.expireDate,
          };
          productDiscounts.push(details);
        }
      }

      scraperLogger.info(
        `Found ${productDiscounts.length} discounts for supermarket '${supermarket}'.`
      );
      return productDiscounts;
    } catch (error) {
      scraperLogger.error("Error retrieving supermarket discounts:", error);
      throw new Error("Failed to retrieve supermarket discounts.");
    }
  }

  public async getSupermarketExpireDate(supermarket: string): Promise<string> {
    scraperLogger.debug("Fetching data to determine supermarket expire date.");

    try {
      const products = await this.productController.getProductsBySupermarket(
        supermarket
      );

      if (products.length === 0) {
        scraperLogger.warn(
          `No products found for supermarket '${supermarket}'.`
        );
        return "";
      }

      const discounts = await this.discountController.getDiscountsByProductId(
        products[0].id
      );

      if (discounts.length > 0 && discounts[0].expireDate) {
        scraperLogger.info(
          `Expire date for supermarket '${supermarket}' is '${discounts[0].expireDate}'.`
        );
        return discounts[0].expireDate;
      } else {
        scraperLogger.warn(
          `No matching discounts found for supermarket '${supermarket}'.`
        );
        return "";
      }
    } catch (error) {
      scraperLogger.error(
        `Error getting expire date for supermarket '${supermarket}':`,
        error
      );
      return "";
    }
  }

  public async deleteRecordsBySupermarket(
    supermarket: string
  ): Promise<number> {
    scraperLogger.debug(
      `Deactivating discounts for '${supermarket}' (products will be updated, not deleted).`
    );

    try {
      // Deactivate all active discounts for this supermarket
      const deactivatedCount =
        await this.discountController.deactivateDiscountsBySupermarket(
          supermarket
        );

      scraperLogger.info(
        `Deactivated ${deactivatedCount} discount records for '${supermarket}'. Products will be updated during the next scrape.`
      );

      return deactivatedCount;
    } catch (error) {
      scraperLogger.error("Error during deactivation:", error);
      throw new Error("Failed to deactivate discounts for supermarket.");
    }
  }

  public async close(): Promise<void> {
    await this.db.close();
  }
}

export default PostgresDataManager;
