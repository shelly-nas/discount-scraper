import JsonDataContext from "../data/JsonDataContext";
import ProductModel from "../models/ProductModel";
import { logger } from "../utils/Logger";

class ProductController {
  private context: JsonDataContext<ProductModel>;

  constructor(context: JsonDataContext<ProductModel>) {
    this.context = context;
  }

  async getProducts(): Promise<ProductModel[]> {
    return await this.context.load();
  }

  async addProduct(name: string, category: number): Promise<void> {
    const product = await this.context.load();
    const alreadyExists = product.some((product) => product.name === name);

    if (!alreadyExists) {
      // Get all the existing IDs sorted in ascending order
      const existingIds = product.map((p) => p.id).sort((a, b) => a - b);

      // Find the first missing ID in the sequence
      let newId = 1; // Start checking from the first ID
      for (let i = 0; i < existingIds.length; ++i) {
        if (existingIds[i] > newId) break; // Found a gap in the sequence
        newId++; // No gap, move to next ID
      }

      const newProduct = new ProductModel(name, category, newId);
      product.push(newProduct);

      await this.context.save(product);
    }
  }

  async updateProducts(
    key: keyof ProductModel,
    updateObjects: Partial<ProductModel>[]
  ): Promise<void> {
    const products = await this.context.load();

    // Iterate through each update object
    for (const updateObj of updateObjects) {
      // Find the index using the 'id' from the updateObj
      const productIndex = products.findIndex(
        (product) => product.id === updateObj.id
      );

      if (productIndex !== -1 && updateObj[key] !== undefined) {
        // Update the key value of the product
        products[productIndex][key] = updateObj[key] as never;
      }
    }

    // Save the updated products array back to the context
    await this.context.save(products);
  }
}

export default ProductController;
