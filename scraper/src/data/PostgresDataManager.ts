import PostgresDiscountController from "../controllers/PostgresDiscountController";
import PostgresProductController from "../controllers/PostgresProductController";
import { logger } from "../utils/Logger";
import PostgresDataContext from "./PostgresDataContext";
import { getDatabaseConfig } from "../config/Database";

export class PostgresDataManager {
  private productController: PostgresProductController;
  private discountController: PostgresDiscountController;
  private db: PostgresDataContext;

  constructor() {
    const config = getDatabaseConfig();
    this.db = PostgresDataContext.getInstance(config);

    this.productController = new PostgresProductController(this.db);
    this.discountController = new PostgresDiscountController(this.db);

    logger.info("PostgresDataManager initialized.");
  }

  public getProductController(): PostgresProductController {
    return this.productController;
  }

  public getDiscountController(): PostgresDiscountController {
    return this.discountController;
  }

  public async testConnection(): Promise<boolean> {
    return await this.db.testConnection();
  }

  public async addProductDb(
    supermarket: string,
    products: IProductDiscountDetails[]
  ): Promise<void> {
    logger.debug("Add to Product database.");
    for (const product of products) {
      await this.productController.addProduct(
        product.name,
        product.category,
        supermarket
      );
    }
    logger.info(`Added '${products.length}' products to Product Database.`);
  }

  public async addDiscountDb(
    discounts: IProductDiscountDetails[]
  ): Promise<void> {
    logger.debug("Add to Discount database.");
    for (const discount of discounts) {
      const productId = await this.productController.getProductId(
        discount.name
      );

      if (productId === -1) {
        logger.warn(`Product '${discount.name}' not found. Skipping discount.`);
        continue;
      }

      await this.discountController.addDiscount(
        productId,
        discount.originalPrice,
        discount.discountPrice,
        discount.specialDiscount,
        discount.expireDate
      );
    }
    logger.info(`Added '${discounts.length}' discounts to Discount Database.`);
  }

  public async getSupermarketDiscountsVerbose(
    supermarket: string
  ): Promise<IProductDiscountDetails[]> {
    logger.debug(
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

      logger.info(
        `Found ${productDiscounts.length} discounts for supermarket '${supermarket}'.`
      );
      return productDiscounts;
    } catch (error) {
      logger.error("Error retrieving supermarket discounts:", error);
      throw new Error("Failed to retrieve supermarket discounts.");
    }
  }

  public async getSupermarketExpireDate(supermarket: string): Promise<string> {
    logger.debug("Fetching data to determine supermarket expire date.");

    try {
      const products = await this.productController.getProductsBySupermarket(
        supermarket
      );

      if (products.length === 0) {
        logger.warn(`No products found for supermarket '${supermarket}'.`);
        return "";
      }

      const discounts = await this.discountController.getDiscountsByProductId(
        products[0].id
      );

      if (discounts.length > 0 && discounts[0].expireDate) {
        logger.info(
          `Expire date for supermarket '${supermarket}' is '${discounts[0].expireDate}'.`
        );
        return discounts[0].expireDate;
      } else {
        logger.warn(
          `No matching discounts found for supermarket '${supermarket}'.`
        );
        return "";
      }
    } catch (error) {
      logger.error(
        `Error getting expire date for supermarket '${supermarket}':`,
        error
      );
      return "";
    }
  }

  public async deleteRecordsBySupermarket(supermarket: string): Promise<void> {
    logger.debug(
      `Starting deletion of all records related to '${supermarket}'.`
    );

    try {
      const products = await this.productController.getProductsBySupermarket(
        supermarket
      );
      const productIds = products.map((p) => p.id);

      let productsDeleted = 0;
      let discountsDeleted = 0;

      // Delete discounts first (due to foreign key constraint)
      for (const id of productIds) {
        const discountDeleted = await this.discountController.deleteDiscount(
          id
        );
        if (discountDeleted) {
          discountsDeleted++;
        }
      }

      // Then delete products
      for (const id of productIds) {
        const productDeleted = await this.productController.deleteProduct(id);
        if (productDeleted) {
          productsDeleted++;
        }
      }

      logger.info(
        `Deleted ${productsDeleted} product records and ${discountsDeleted} discount records related to '${supermarket}'.`
      );
    } catch (error) {
      logger.error("Error during deletion:", error);
      throw new Error("Failed to delete database entries for supermarket.");
    }
  }

  public async close(): Promise<void> {
    await this.db.close();
  }
}

export default PostgresDataManager;
