import JsonDataContext from "../data/JsonDataContext";
import ProductCategoryModel from "../models/ProductCategoryModel";

class ProductCategoryController {
  private context: JsonDataContext<ProductCategoryModel>;

  constructor(context: JsonDataContext<ProductCategoryModel>) {
    this.context = context;
  }

  async exists(): Promise<void> {
    return await this.context.exists()
  }

  async getCategories(): Promise<ProductCategoryModel[]> {
    return await this.context.load();
  }

  async addCategory(name: string): Promise<void> {
    const categories = await this.context.load();
    const alreadyExists = categories.some(category => category.name === name);
  
    if (!alreadyExists) {
      // Get all the existing IDs sorted in ascending order
      const existingIds = categories.map(c => c.id).sort((a, b) => a - b);
      
      // Find the first missing ID in the sequence
      let newId = 1; // Start checking from the first ID
      for (let i = 0; i < existingIds.length; ++i) {
        if (existingIds[i] > newId) break; // Found a gap in the sequence
        newId++; // No gap, move to next ID
      }
  
      const newCategory = new ProductCategoryModel(name, newId);
      categories.push(newCategory);
  
      await this.context.save(categories);
    }
  }
}

export default ProductCategoryController;
