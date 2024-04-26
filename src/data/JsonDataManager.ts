import ProductCategoryController from "../controllers/ProductCategoryController";
import ProductController from "../controllers/ProductController";
import ProductCategoryModel from "../models/ProductCategoryModel";
import ProductModel from "../models/ProductModel";
import { getEnvVariable } from "../utils/ConfigHelper";
import JsonDataContext from "./JsonDataContext";

export async function createProductCategoryDb(
  categories: string[]
): Promise<void> {
  const context = new JsonDataContext<ProductCategoryModel>(
    getEnvVariable("DB_PRODUCT_CATEGORY")
  );
  const controller = new ProductCategoryController(context);

  for (const productCategory of categories) {
    await controller.addCategory(productCategory);
  }
}

export async function createProductDb(
  discounts: IProductDiscount[]
): Promise<void> {
  const context = new JsonDataContext<ProductModel>(
    getEnvVariable("DB_PRODUCT")
  );
  const controller = new ProductController(context);

  for (const discount of discounts) {
    await controller.addProduct(discount.productName, 0);
  }
}

export async function updateProductDb(
  key: keyof ProductModel, productDb: Partial<ProductModel>[]
): Promise<void> {
  const context = new JsonDataContext<ProductModel>(
    getEnvVariable("DB_PRODUCT")
  );
  const controller = new ProductController(context);

  await controller.updateProducts(key, productDb);
}
