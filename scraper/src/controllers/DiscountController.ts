import JsonDataContext from "../data/JsonDataContext";
import { DiscountModel } from "../models/DiscountModel";
import { logger } from "../utils/Logger";

class DiscountController {
  private context: JsonDataContext<DiscountModel>;

  constructor(context: JsonDataContext<DiscountModel>) {
    this.context = context;
  }

  async exists(): Promise<boolean> {
    logger.debug("Checking if the discount database exist.");
    return await this.context.exists();
  }

  async delete(): Promise<void> {
    logger.debug("Delete the discount database exist.");
    return await this.context.deleteFile();
  }

  async getDiscounts(): Promise<DiscountModel[]> {
    logger.info("Fetching all discounts.");
    return await this.context.load();
  }

  async addDiscount(
    productId: number,
    originalPrice: number,
    discountPrice: number,
    specialDiscount: string,
    expireDate: string
  ): Promise<void> {
    const discounts = await this.context.load();
    
    const discount = new DiscountModel(
      productId,
      originalPrice,
      discountPrice,
      specialDiscount,
      expireDate
    );
    discounts.push(discount);

    await this.context.save(discounts);
    logger.debug(`New discount added for product ID '${productId}'.`);
  }

  async deleteDiscount(productId: number): Promise<boolean> {
    logger.debug(`Attempting to delete discount with product ID: ${productId}`);
    const discounts = await this.context.load();
    const filteredProducts = discounts.filter(d => d.product !== productId);
    
    if (discounts.length === filteredProducts.length) {
      logger.warn(`Discount with product ID: ${productId} not found.`);
      return false;
    }
    
    await this.context.save(filteredProducts);
    logger.info(`Discount with product ID: ${productId} has been deleted.`);
    return true;
  }
}

export default DiscountController;
