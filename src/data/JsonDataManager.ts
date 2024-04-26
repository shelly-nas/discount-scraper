import DiscountController from "../controllers/DiscountController";
import ProductCategoryController from "../controllers/ProductCategoryController";
import ProductController from "../controllers/ProductController";
import { DiscountModel } from "../models/DiscountModel";
import ProductCategoryModel from "../models/ProductCategoryModel";
import ProductModel from "../models/ProductModel";
import { getEnvVariable } from "../utils/ConfigHelper";
import { logger } from "../utils/Logger";
import JsonDataContext from "./JsonDataContext";

export async function createProductCategoryDb(
  categories: string[]
): Promise<void> {
  logger.debug("Creating ProductCategory database...");
  const productCategoryContext = new JsonDataContext<ProductCategoryModel>(
    getEnvVariable("DB_PRODUCT_CATEGORY")
  );
  const productCategoryController = new ProductCategoryController(
    productCategoryContext
  );

  for (const productCategory of categories) {
    await productCategoryController.addCategory(productCategory);
  }
  logger.info("Created and filled ProductCategory database.");
}

export async function createProductDb(
  products: IProductDiscount[]
): Promise<void> {
  logger.debug("Creating Product database...");
  const productContext = new JsonDataContext<ProductModel>(
    getEnvVariable("DB_PRODUCT")
  );
  const productController = new ProductController(productContext);

  for (const product of products) {
    await productController.addProduct(product.productName, 0);
  }
  logger.info("Created and filled Product database.");
}

export async function updateProductDb(
  key: keyof ProductModel,
  productDb: Partial<ProductModel>[]
): Promise<void> {
  logger.debug("Updating Product database...");
  const productContext = new JsonDataContext<ProductModel>(
    getEnvVariable("DB_PRODUCT")
  );
  const productController = new ProductController(productContext);

  await productController.updateProducts(key, productDb);
  logger.info(`Updated Product database for key '${key}'.`);
}

export async function createDiscountDb(
  discounts: IProductDiscount[]
): Promise<void> {
  logger.debug("Creating Discount database...");
  const discountContext = new JsonDataContext<DiscountModel>(
    getEnvVariable("DB_DISCOUNT")
  );
  const discountController = new DiscountController(discountContext);
  const productContext = new JsonDataContext<ProductModel>(
    getEnvVariable("DB_PRODUCT")
  );
  const productController = new ProductController(productContext);

  for (const discount of discounts) {
    const productId = await productController.getProductId(
      discount.productName
    );
    await discountController.addDiscount(
      productId,
      discount.originalPrice,
      discount.discountPrice,
      discount.specialDiscount
    );
  }
  logger.info("Created and filled Discount database.");
}
