import PostgresDataContext from "../data/PostgresDataContext";
import ProductModel from "../models/ProductModel";
import { scraperLogger } from "../utils/Logger";

class PostgresProductController {
  private db: PostgresDataContext;

  constructor(db: PostgresDataContext) {
    this.db = db;
    scraperLogger.debug("PostgresProductController initialized.");
  }

  async exists(): Promise<boolean> {
    scraperLogger.debug("Checking if the products table exists.");
    try {
      const result = await this.db.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'products'
        )`
      );
      return result.rows[0].exists;
    } catch (error) {
      scraperLogger.error("Error checking if products table exists", error);
      return false;
    }
  }

  async delete(): Promise<void> {
    scraperLogger.debug("Deleting all products from database.");
    try {
      await this.db.query("TRUNCATE TABLE products CASCADE");
      scraperLogger.info("All products deleted successfully.");
    } catch (error) {
      scraperLogger.error("Error deleting products", error);
      throw error;
    }
  }

  async getProducts(): Promise<ProductModel[]> {
    scraperLogger.info("Fetching all products.");
    try {
      const result = await this.db.query<ProductModel>(
        "SELECT id, name, category, supermarket FROM products ORDER BY id"
      );
      return result.rows;
    } catch (error) {
      scraperLogger.error("Error fetching products", error);
      throw error;
    }
  }

  async getProductById(id: number): Promise<ProductModel | null> {
    scraperLogger.debug(`Fetching product with ID: ${id}`);
    try {
      const result = await this.db.query<ProductModel>(
        "SELECT id, name, category, supermarket FROM products WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      scraperLogger.error(`Error fetching product with ID: ${id}`, error);
      throw error;
    }
  }

  async getProductsByCategory(category: string): Promise<ProductModel[]> {
    scraperLogger.debug(`Fetching products in category: ${category}`);
    try {
      const result = await this.db.query<ProductModel>(
        "SELECT id, name, category, supermarket FROM products WHERE category = $1 ORDER BY name",
        [category]
      );
      return result.rows;
    } catch (error) {
      scraperLogger.error(
        `Error fetching products by category: ${category}`,
        error
      );
      throw error;
    }
  }

  async getProductsBySupermarket(supermarket: string): Promise<ProductModel[]> {
    scraperLogger.debug(`Fetching products from supermarket: ${supermarket}`);
    try {
      const result = await this.db.query<ProductModel>(
        "SELECT id, name, category, supermarket FROM products WHERE supermarket = $1 ORDER BY category, name",
        [supermarket]
      );
      return result.rows;
    } catch (error) {
      scraperLogger.error(
        `Error fetching products by supermarket: ${supermarket}`,
        error
      );
      throw error;
    }
  }

  async searchProducts(searchTerm: string): Promise<ProductModel[]> {
    scraperLogger.debug(`Searching products with term: ${searchTerm}`);
    try {
      // Use full-text search for better performance
      const result = await this.db.query<ProductModel>(
        `SELECT id, name, category, supermarket 
         FROM products 
         WHERE to_tsvector('english', name) @@ plainto_tsquery('english', $1)
         OR name ILIKE $2
         ORDER BY name`,
        [searchTerm, `%${searchTerm}%`]
      );
      return result.rows;
    } catch (error) {
      scraperLogger.error(
        `Error searching products with term: ${searchTerm}`,
        error
      );
      throw error;
    }
  }

  async deleteProduct(productId: number): Promise<boolean> {
    scraperLogger.debug(`Attempting to delete product with ID: ${productId}`);
    try {
      const result = await this.db.query("DELETE FROM products WHERE id = $1", [
        productId,
      ]);

      if (result.rowCount === 0) {
        scraperLogger.warn(`Product with ID: ${productId} not found.`);
        return false;
      }

      scraperLogger.debug(`Product with ID: ${productId} has been deleted.`);
      return true;
    } catch (error) {
      scraperLogger.error(
        `Error deleting product with ID: ${productId}`,
        error
      );
      throw error;
    }
  }

  async getProductId(name: string): Promise<number> {
    try {
      const result = await this.db.query<{ id: number }>(
        "SELECT id FROM products WHERE name = $1 LIMIT 1",
        [name]
      );

      if (result.rows.length > 0) {
        scraperLogger.debug(
          `Product '${name}' found with ID '${result.rows[0].id}'.`
        );
        return result.rows[0].id;
      } else {
        scraperLogger.error(`Product '${name}' not found.`);
        return -1;
      }
    } catch (error) {
      scraperLogger.error(`Error getting product ID for name: ${name}`, error);
      throw error;
    }
  }

  async addProduct(
    name: string,
    category: string,
    supermarket: string
  ): Promise<number> {
    try {
      // Use UPSERT to insert or update product
      // If product exists (name + supermarket), update the category
      const result = await this.db.query<{ id: number }>(
        `INSERT INTO products (name, category, supermarket) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name, supermarket) 
         DO UPDATE SET 
           category = EXCLUDED.category,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [name, category, supermarket]
      );

      const id = result.rows[0].id;
      scraperLogger.debug(`Product '${name}' upserted with ID '${id}'.`);
      return id;
    } catch (error) {
      scraperLogger.error(`Error upserting product '${name}'`, error);
      throw error;
    }
  }

  async addProductWithTracking(
    name: string,
    category: string,
    supermarket: string
  ): Promise<{ id: number; wasCreated: boolean }> {
    try {
      // Check if product exists first to track creation vs update
      const existingProduct = await this.db.query<{ id: number }>(
        "SELECT id FROM products WHERE name = $1 AND supermarket = $2",
        [name, supermarket]
      );

      const wasCreated = existingProduct.rows.length === 0;

      // Use UPSERT to insert or update product
      const result = await this.db.query<{ id: number }>(
        `INSERT INTO products (name, category, supermarket) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name, supermarket) 
         DO UPDATE SET 
           category = EXCLUDED.category,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [name, category, supermarket]
      );

      const id = result.rows[0].id;
      scraperLogger.debug(
        `Product '${name}' ${
          wasCreated ? "created" : "updated"
        } with ID '${id}'.`
      );
      return { id, wasCreated };
    } catch (error) {
      scraperLogger.error(`Error upserting product '${name}'`, error);
      throw error;
    }
  }

  async updateProduct(
    id: number,
    updates: Partial<Omit<ProductModel, "id">>
  ): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }
      if (updates.supermarket !== undefined) {
        updateFields.push(`supermarket = $${paramIndex++}`);
        values.push(updates.supermarket);
      }

      if (updateFields.length === 0) {
        scraperLogger.info("No fields to update.");
        return false;
      }

      values.push(id);
      const query = `UPDATE products SET ${updateFields.join(
        ", "
      )} WHERE id = $${paramIndex}`;

      const result = await this.db.query(query, values);

      if (result.rowCount === 0) {
        scraperLogger.warn(`Product with ID: ${id} not found for update.`);
        return false;
      }

      scraperLogger.debug(`Product ID '${id}' updated successfully.`);
      return true;
    } catch (error) {
      scraperLogger.error(`Error updating product with ID: ${id}`, error);
      throw error;
    }
  }

  async updateProducts(
    key: keyof Omit<ProductModel, "id">,
    updateObjects: Array<{ id: number; [key: string]: any }>
  ): Promise<void> {
    try {
      let changesMade = 0;

      for (const updateObj of updateObjects) {
        if (updateObj[key] !== undefined) {
          const result = await this.db.query(
            `UPDATE products SET ${key} = $1 WHERE id = $2`,
            [updateObj[key], updateObj.id]
          );

          if (result.rowCount && result.rowCount > 0) {
            changesMade++;
            scraperLogger.debug(
              `Product ID '${updateObj.id}' updated: '${key}' set to '${updateObj[key]}'.`
            );
          }
        }
      }

      if (changesMade > 0) {
        scraperLogger.info(`${changesMade} products updated successfully.`);
      } else {
        scraperLogger.info("No updates were made to products.");
      }
    } catch (error) {
      scraperLogger.error("Error updating multiple products", error);
      throw error;
    }
  }
}

export default PostgresProductController;
