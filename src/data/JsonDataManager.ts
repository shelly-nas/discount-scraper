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

  public async getSupermarketDiscountsVerbose(): Promise<IProductDiscountDetails[]> {
    logger.debug("Combine databases to create a ProductDiscountDetails structure.");
    let productDiscounts: IProductDiscountDetails[] = [];
    const products = await this.productController.getProducts();
    const discounts = await this.discountController.getDiscounts();

    for (const discount of discounts) {
      try {
        let productIndex = products.findIndex(
          (product) => product.id === discount.product
        );
        const details: IProductDiscountDetails = {
          name: products[productIndex].name,
          originalPrice: discount.originalPrice,
          discountPrice: discount.discountPrice,
          specialDiscount: discount.specialDiscount,
          category: products[productIndex].category,
          supermarket: products[productIndex].supermarket,
          expireDate: discount.expireDate,
        };
        productDiscounts.push(details);
      } catch (error) {
        logger.error("Error:", error);
      }
      
    }
    return productDiscounts;
  }
}

export default JsonDataManager;
