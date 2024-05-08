import JsonDataContext from "../data/JsonDataContext";
import ProductModel from "../models/ProductModel";
import { logger } from "../utils/Logger";

class ProductController {
  private context: JsonDataContext<ProductModel>;

  constructor(context: JsonDataContext<ProductModel>) {
    this.context = context;
    logger.debug("ProductController initialized.");
  }

  async exists(): Promise<boolean> {
    logger.debug("Checking if the product database exists.");
    return await this.context.exists();
  }

  async delete(): Promise<void> {
    logger.debug("Delete the product database exist.");
    return await this.context.deleteFile();
  }

  async getProducts(): Promise<ProductModel[]> {
    logger.info("Fetching all products.");
    return await this.context.load();
  }

  async deleteProduct(productId: number): Promise<boolean> {
    logger.debug(`Attempting to delete product with ID: ${productId}`);
    const products = await this.context.load();
    const filteredProducts = products.filter(p => p.id !== productId);
    
    if (products.length === filteredProducts.length) {
      logger.warn(`Product with ID: ${productId} not found.`);
      return false;
    }

    await this.context.save(filteredProducts);
    logger.debug(`Product with ID: ${productId} has been deleted.`);
    return true;
  }

  async getProductId(name: string): Promise<number> {
    const products = await this.context.load();
    const productIndex = products.findIndex((p) => p.name === name);

    if (productIndex !== -1) {
      logger.debug(
        `Product '${name}' found with ID '${products[productIndex].id}'.`
      );
      return products[productIndex].id;
    } else {
      logger.error(`Product '${name}' not found.`);
      return -1;
    }
  }

  async addProduct(name: string, category: string, supermarket: string): Promise<void> {
    const products = await this.context.load();
    const alreadyExists = products.some((p) => p.name === name);

    if (alreadyExists) {
      logger.warn(`Product '${name}' already exists. No action taken.`);
      return;
    }

    const existingIds = products.map((p) => p.id).sort((a, b) => a - b);
    let newId = 1;
    for (let i = 0; i < existingIds.length; ++i) {
      if (existingIds[i] > newId) break;
      newId++;
    }

    const newProduct = new ProductModel(newId, name, category, supermarket);
    products.push(newProduct);
    await this.context.save(products);
    logger.debug(`New product '${name}' added with ID '${newId}'.`);
  }

  async updateProducts(
    key: keyof ProductModel,
    updateObjects: Partial<ProductModel>[]
  ): Promise<void> {
    const products = await this.context.load();
    let changesMade = false;

    for (const updateObj of updateObjects) {
      const productIndex = products.findIndex(
        (p) => p.id === updateObj.id
      );
      if (productIndex !== -1 && updateObj[key] !== undefined) {
        products[productIndex][key] = updateObj[key] as never;
        changesMade = true;
        logger.debug(
          `Product ID '${updateObj.id}' updated: '${key}' set to '${updateObj[key]}'.`
        );
      }
    }

    if (changesMade) {
      await this.context.save(products);
      logger.info("Products updated successfully.");
    } else {
      logger.info("No updates were made to products.");
    }
  }
}

export default ProductController;
