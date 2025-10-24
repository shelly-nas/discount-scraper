import PostgresDataContext from "../data/PostgresDataContext";
import { DiscountModel } from "../models/DiscountModel";
import { scraperLogger } from "../utils/Logger";

interface DiscountRow {
  id: number;
  product_id: number;
  original_price: string;
  discount_price: string;
  special_discount: string;
  expire_date: Date;
  active: boolean;
}

class PostgresDiscountController {
  private db: PostgresDataContext;

  constructor(db: PostgresDataContext) {
    this.db = db;
    scraperLogger.debug("PostgresDiscountController initialized.");
  }

  async exists(): Promise<boolean> {
    scraperLogger.debug("Checking if the discounts table exists.");
    try {
      const result = await this.db.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'discounts'
        )`
      );
      return result.rows[0].exists;
    } catch (error) {
      scraperLogger.error("Error checking if discounts table exists", error);
      return false;
    }
  }

  async delete(): Promise<void> {
    scraperLogger.debug("Deleting all discounts from database.");
    try {
      await this.db.query("TRUNCATE TABLE discounts CASCADE");
      scraperLogger.info("All discounts deleted successfully.");
    } catch (error) {
      scraperLogger.error("Error deleting discounts", error);
      throw error;
    }
  }

  async getDiscounts(): Promise<DiscountModel[]> {
    scraperLogger.info("Fetching all discounts.");
    try {
      const result = await this.db.query<DiscountRow>(
        "SELECT product_id, original_price, discount_price, special_discount, expire_date, active FROM discounts ORDER BY expire_date DESC"
      );

      return result.rows.map(
        (row: DiscountRow) =>
          new DiscountModel(
            row.product_id,
            parseFloat(row.original_price),
            parseFloat(row.discount_price),
            row.special_discount,
            row.expire_date.toISOString(),
            row.active
          )
      );
    } catch (error) {
      scraperLogger.error("Error fetching discounts", error);
      throw error;
    }
  }

  async getDiscountsByProductId(productId: number): Promise<DiscountModel[]> {
    scraperLogger.debug(`Fetching discounts for product ID: ${productId}`);
    try {
      const result = await this.db.query<DiscountRow>(
        `SELECT product_id, original_price, discount_price, special_discount, expire_date, active 
         FROM discounts 
         WHERE product_id = $1 
         ORDER BY expire_date DESC`,
        [productId]
      );

      return result.rows.map(
        (row: DiscountRow) =>
          new DiscountModel(
            row.product_id,
            parseFloat(row.original_price),
            parseFloat(row.discount_price),
            row.special_discount,
            row.expire_date.toISOString(),
            row.active
          )
      );
    } catch (error) {
      scraperLogger.error(
        `Error fetching discounts for product ID: ${productId}`,
        error
      );
      throw error;
    }
  }

  async getActiveDiscounts(): Promise<DiscountModel[]> {
    scraperLogger.debug(
      "Fetching active discounts (active=true and not expired)."
    );
    try {
      const result = await this.db.query<DiscountRow>(
        `SELECT product_id, original_price, discount_price, special_discount, expire_date, active 
         FROM discounts 
         WHERE active = true AND expire_date > NOW() 
         ORDER BY expire_date ASC`
      );

      return result.rows.map(
        (row: DiscountRow) =>
          new DiscountModel(
            row.product_id,
            parseFloat(row.original_price),
            parseFloat(row.discount_price),
            row.special_discount,
            row.expire_date.toISOString(),
            row.active
          )
      );
    } catch (error) {
      scraperLogger.error("Error fetching active discounts", error);
      throw error;
    }
  }

  async getExpiredDiscounts(): Promise<DiscountModel[]> {
    scraperLogger.debug("Fetching expired discounts.");
    try {
      const result = await this.db.query<DiscountRow>(
        `SELECT product_id, original_price, discount_price, special_discount, expire_date, active 
         FROM discounts 
         WHERE expire_date <= NOW() 
         ORDER BY expire_date DESC`
      );

      return result.rows.map(
        (row: DiscountRow) =>
          new DiscountModel(
            row.product_id,
            parseFloat(row.original_price),
            parseFloat(row.discount_price),
            row.special_discount,
            row.expire_date.toISOString(),
            row.active
          )
      );
    } catch (error) {
      scraperLogger.error("Error fetching expired discounts", error);
      throw error;
    }
  }

  async getDiscountsByPriceRange(
    minPrice: number,
    maxPrice: number
  ): Promise<DiscountModel[]> {
    scraperLogger.debug(
      `Fetching discounts in price range: ${minPrice} - ${maxPrice}`
    );
    try {
      const result = await this.db.query<DiscountRow>(
        `SELECT product_id, original_price, discount_price, special_discount, expire_date, active 
         FROM discounts 
         WHERE discount_price BETWEEN $1 AND $2 
         AND active = true
         AND expire_date > NOW()
         ORDER BY discount_price ASC`,
        [minPrice, maxPrice]
      );

      return result.rows.map(
        (row: DiscountRow) =>
          new DiscountModel(
            row.product_id,
            parseFloat(row.original_price),
            parseFloat(row.discount_price),
            row.special_discount,
            row.expire_date.toISOString(),
            row.active
          )
      );
    } catch (error) {
      scraperLogger.error(
        `Error fetching discounts by price range: ${minPrice} - ${maxPrice}`,
        error
      );
      throw error;
    }
  }

  async addDiscount(
    productId: number,
    originalPrice: number,
    discountPrice: number,
    specialDiscount: string,
    expireDate: string
  ): Promise<number> {
    try {
      const result = await this.db.query<{ id: number }>(
        `INSERT INTO discounts (product_id, original_price, discount_price, special_discount, expire_date, active) 
         VALUES ($1, $2, $3, $4, $5, true) 
         RETURNING id`,
        [productId, originalPrice, discountPrice, specialDiscount, expireDate]
      );

      const newId = result.rows[0].id;
      scraperLogger.debug(
        `New discount added for product ID '${productId}' with discount ID '${newId}'.`
      );
      return newId;
    } catch (error) {
      scraperLogger.error(
        `Error adding discount for product ID: ${productId}`,
        error
      );
      throw error;
    }
  }

  async deleteDiscount(productId: number): Promise<boolean> {
    scraperLogger.debug(
      `Attempting to delete discounts for product ID: ${productId}`
    );
    try {
      const result = await this.db.query(
        "DELETE FROM discounts WHERE product_id = $1",
        [productId]
      );

      if (result.rowCount === 0) {
        scraperLogger.warn(`No discounts found for product ID: ${productId}.`);
        return false;
      }

      scraperLogger.info(
        `Discounts for product ID: ${productId} have been deleted (${result.rowCount} records).`
      );
      return true;
    } catch (error) {
      scraperLogger.error(
        `Error deleting discounts for product ID: ${productId}`,
        error
      );
      throw error;
    }
  }

  async deleteExpiredDiscounts(): Promise<number> {
    scraperLogger.debug("Deleting expired discounts.");
    try {
      const result = await this.db.query(
        "DELETE FROM discounts WHERE expire_date <= NOW()"
      );

      const deletedCount = result.rowCount || 0;
      scraperLogger.info(`Deleted ${deletedCount} expired discounts.`);
      return deletedCount;
    } catch (error) {
      scraperLogger.error("Error deleting expired discounts", error);
      throw error;
    }
  }

  async updateDiscount(
    productId: number,
    originalPrice: number,
    discountPrice: number,
    specialDiscount: string,
    expireDate: string
  ): Promise<boolean> {
    scraperLogger.debug(`Updating discount for product ID: ${productId}`);
    try {
      const result = await this.db.query(
        `UPDATE discounts 
         SET original_price = $2, discount_price = $3, special_discount = $4, expire_date = $5, active = true
         WHERE product_id = $1`,
        [productId, originalPrice, discountPrice, specialDiscount, expireDate]
      );

      if (result.rowCount === 0) {
        scraperLogger.warn(
          `No discount found for product ID: ${productId} to update.`
        );
        return false;
      }

      scraperLogger.debug(
        `Discount for product ID: ${productId} updated successfully.`
      );
      return true;
    } catch (error) {
      scraperLogger.error(
        `Error updating discount for product ID: ${productId}`,
        error
      );
      throw error;
    }
  }

  async deactivateDiscountsByProductIds(productIds: number[]): Promise<number> {
    scraperLogger.debug(
      `Deactivating discounts for ${productIds.length} products`
    );
    try {
      if (productIds.length === 0) {
        return 0;
      }

      const result = await this.db.query(
        `UPDATE discounts 
         SET active = false 
         WHERE product_id = ANY($1) AND active = true`,
        [productIds]
      );

      const deactivatedCount = result.rowCount || 0;
      scraperLogger.info(`Deactivated ${deactivatedCount} discounts.`);
      return deactivatedCount;
    } catch (error) {
      scraperLogger.error("Error deactivating discounts", error);
      throw error;
    }
  }

  async deactivateDiscountsBySupermarket(supermarket: string): Promise<number> {
    scraperLogger.debug(
      `Deactivating all active discounts for supermarket: ${supermarket}`
    );
    try {
      const result = await this.db.query(
        `UPDATE discounts 
         SET active = false 
         WHERE active = true 
         AND product_id IN (
           SELECT id FROM products WHERE supermarket = $1
         )`,
        [supermarket]
      );

      const deactivatedCount = result.rowCount || 0;
      scraperLogger.info(
        `Deactivated ${deactivatedCount} discounts for ${supermarket}.`
      );
      return deactivatedCount;
    } catch (error) {
      scraperLogger.error(
        `Error deactivating discounts for ${supermarket}`,
        error
      );
      throw error;
    }
  }
}

export default PostgresDiscountController;
