import JsonDataContext from "../data/JsonDataContext";
import ProductCategoryModel from "../models/ProductCategoryModel";
import { logger } from "../utils/Logger";

class ProductCategoryController {
  private context: JsonDataContext<ProductCategoryModel>;

  constructor(context: JsonDataContext<ProductCategoryModel>) {
    this.context = context;
    logger.debug("ProductCategoryController initialized.");
  }

  async exists(): Promise<void> {
    logger.debug("Checking if the product categories database exist.");
    return await this.context.exists();
  }

  async getCategories(): Promise<ProductCategoryModel[]> {
    logger.info("Fetching all product categories.");
    return await this.context.load();
  }

  async addCategory(name: string): Promise<void> {
    const categories = await this.context.load();
    const alreadyExists = categories.some((category) => category.name === name);

    if (alreadyExists) {
      logger.warn(`Category '${name}' already exists. No action taken.`);
      return;
    }

    const existingIds = categories.map((c) => c.id).sort((a, b) => a - b);
    let newId = 1;
    for (let i = 0; i < existingIds.length; ++i) {
      if (existingIds[i] > newId) break;
      newId++;
    }

    const newCategory = new ProductCategoryModel(name, newId);
    categories.push(newCategory);
    await this.context.save(categories);
    logger.debug(`New category '${name}' added with ID '${newId}'.`);
  }
}

export default ProductCategoryController;
