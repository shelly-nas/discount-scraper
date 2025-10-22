import DiscountController from "../controllers/DiscountController";
import ProductController from "../controllers/ProductController";
import { DiscountModel } from "../models/DiscountModel";
import ProductModel from "../models/ProductModel";
import { getEnvVariable } from "../utils/ConfigHelper";
import { logger } from "../utils/Logger";
import JsonDataContext from "./JsonDataContext";

export class JsonDataManager {
  private productController: ProductController;
  private discountController: DiscountController;
  private productDb: string = getEnvVariable("DB_PRODUCT");
  private discountDb: string = getEnvVariable("DB_DISCOUNT");

  constructor() {
    const productContext = new JsonDataContext<ProductModel>(this.productDb);
    this.productController = new ProductController(productContext);

    const discountContext = new JsonDataContext<DiscountModel>(this.discountDb);
    this.discountController = new DiscountController(discountContext);
  }

  public getProductController(): ProductController {
    return this.productController;
  }

  public getDiscountController(): DiscountController {
    return this.discountController;
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

  public async updateProductDb(
    key: keyof ProductModel,
    productDb: Partial<ProductModel>[]
  ): Promise<void> {
    logger.debug("Updating Product database...");
    await this.productController.updateProducts(key, productDb);
    logger.info(`Updated Product database for key '${key}'.`);
  }

  public async addDiscountDb(discounts: IProductDiscountDetails[]): Promise<void> {
    logger.debug("Add to Discount database.");
    for (const discount of discounts) {
      const productId = await this.productController.getProductId(
        discount.name
      );
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
    logger.debug("Combine databases to create a ProductDiscountDetails structure.");

    try {
      const products = await this.productController.getProducts();
      const discounts = await this.discountController.getDiscounts();

      // Create a map of products by ID for quick lookup
      const productMap = new Map(products.map(p => [p.id, p]));

      // Filter and map discounts to details if they match the supermarket
      let productDiscounts = discounts.reduce((acc, discount) => {
        const product = productMap.get(discount.product);
        if (product && product.supermarket === supermarket) {
          const details: IProductDiscountDetails = {
            name: product.name,
            originalPrice: discount.originalPrice,
            discountPrice: discount.discountPrice,
            specialDiscount: discount.specialDiscount,
            category: product.category,
            supermarket: product.supermarket,
            expireDate: discount.expireDate,
          };
          acc.push(details);
        }
        return acc;
      }, [] as IProductDiscountDetails[]);

      logger.info(`Found ${productDiscounts.length} discounts for supermarket '${supermarket}'.`);
      return productDiscounts;
    } catch (error) {
      logger.error("Error retrieving supermarket discounts:", error);
      throw new Error("Failed to retrieve supermarket discounts.");
    }
  }

  public async getSupermarketExpireDate(supermarket: string): Promise<string> {
    logger.debug("Fetching data to determine supermarket expire date.");

    const products = await this.productController.getProducts();
    const discounts = await this.discountController.getDiscounts();

    const supermarketProducts = products.filter(p => p.supermarket === supermarket);
    const productIds = new Set(supermarketProducts.map(p => p.id));
    const matchingDiscount = discounts.find(d => productIds.has(d.product) && d.expireDate);

    if (matchingDiscount) {
      logger.info(`Expire date for supermarket '${supermarket}' is '${matchingDiscount.expireDate}'.`);
      return matchingDiscount.expireDate;
    } else {
      logger.warn(`No matching discounts found for supermarket '${supermarket}'.`);
      return '';
    }
  }

  public async deleteRecordsBySupermarket(supermarket: string): Promise<void> {
    logger.debug(`Starting deletion of all records related to '${supermarket}'.`);

    try {
      const products = await this.productController.getProducts();
      const productIds = products
        .filter(p => p.supermarket === supermarket)
        .map(p => p.id);

      // Deleting products and corresponding discounts synchronously
      let productsDeleted = 0;
      let discountsDeleted = 0;

      for (const id of productIds) {
        // Delete product and increment counter if successful
        const productDeletionResult = await this.productController.deleteProduct(id);
        if (productDeletionResult === true) {  // Assuming deleteProduct returns true on success
          productsDeleted++;
        }

        // Delete discount and increment counter if successful
        const discountDeletionResult = await this.discountController.deleteDiscount(id);
        if (discountDeletionResult === true) {  // Assuming deleteDiscount returns true on success
          discountsDeleted++;
        }
      }

      logger.info(`Deleted ${productsDeleted} product records and ${discountsDeleted} discount records related to '${supermarket}'.`);
    } catch (error) {
      logger.error("Error during deletion:", error);
      throw new Error("Failed to delete database entries for supermarket.");
    }
  }
}

export default JsonDataManager;
