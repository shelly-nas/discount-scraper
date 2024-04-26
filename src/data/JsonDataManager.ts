import DiscountController from "../controllers/DiscountController";
import ProductCategoryController from "../controllers/ProductCategoryController";
import ProductController from "../controllers/ProductController";
import { DiscountModel } from "../models/DiscountModel";
import ProductCategoryModel from "../models/ProductCategoryModel";
import ProductModel from "../models/ProductModel";
import { getEnvVariable } from "../utils/ConfigHelper";
import { logger } from "../utils/Logger";
import JsonDataContext from "./JsonDataContext";

export class JsonDataManager {
  private productCategoryController: ProductCategoryController;
  private productController: ProductController;
  private discountController: DiscountController;
  private productCategoryDb: string = getEnvVariable("DB_PRODUCT_CATEGORY");
  private productDb: string = getEnvVariable("DB_PRODUCT");
  private discountDb: string = getEnvVariable("DB_DISCOUNT");

  constructor() {
    const productCategoryContext = new JsonDataContext<ProductCategoryModel>(
      this.productCategoryDb
    );
    this.productCategoryController = new ProductCategoryController(
      productCategoryContext
    );

    const productContext = new JsonDataContext<ProductModel>(this.productDb);
    this.productController = new ProductController(productContext);

    const discountContext = new JsonDataContext<DiscountModel>(this.discountDb);
    this.discountController = new DiscountController(discountContext);
  }

  public getProductCategoryController(): ProductCategoryController {
    return this.productCategoryController;
  }

  public getProductController(): ProductController {
    return this.productController;
  }

  public getDiscountController(): DiscountController {
    return this.discountController;
  }

  public async addProductCategoryDb(categories: string[]): Promise<void> {
    logger.debug("Add to ProductCategory database.");
    for (const productCategory of categories) {
      await this.productCategoryController.addCategory(productCategory);
    }
    logger.info("Filled ProductCategory database.");
  }

  public async addProductDb(
    supermarket: string,
    products: IProductDiscount[]
  ): Promise<void> {
    logger.debug("Add to Product database.");
    for (const product of products) {
      await this.productController.addProduct(
        product.productName,
        0,
        supermarket
      );
    }
    logger.info("A Product database.");
  }

  public async updateProductDb(
    key: keyof ProductModel,
    productDb: Partial<ProductModel>[]
  ): Promise<void> {
    logger.debug("Updating Product database...");
    await this.productController.updateProducts(key, productDb);
    logger.info(`Updated Product database for key '${key}'.`);
  }

  public async addDiscountDb(discounts: IProductDiscount[]): Promise<void> {
    logger.debug("Add to Discount database.");
    for (const discount of discounts) {
      const productId = await this.productController.getProductId(
        discount.productName
      );
      await this.discountController.addDiscount(
        productId,
        discount.originalPrice,
        discount.discountPrice,
        discount.specialDiscount
      );
    }
    logger.info("Filled Discount database.");
  }

  public async getGroceryDiscountsVerbose(): Promise<IGroceryDiscount[]> {
    logger.debug("Combine databases to create a Grocery Discount structure.");
    const groceryDiscounts: IGroceryDiscount[] = [];
    const products = await this.productController.getProducts();
    const discounts = await this.discountController.getDiscounts();
    const categories = await this.productCategoryController.getCategories();

    for (const discount of discounts) {
      const productIndex = products.findIndex(
        (product) => product.id === discount.product
      );
      const categoryIndex = categories.findIndex(
        (category) => category.id === products[productIndex].category
      );
      const groceryDiscount: IGroceryDiscount = {
        productCategory: categories[categoryIndex].name,
        productName: products[productIndex].name,
        originalPrice: discount.originalPrice,
        discountPrice: discount.discountPrice,
        specialDiscount: discount.specialDiscount,
        supermarket: products[productIndex].supermarket,
      };
      groceryDiscounts.push(groceryDiscount);
    }
    return groceryDiscounts;
  }
}

export default JsonDataManager;
