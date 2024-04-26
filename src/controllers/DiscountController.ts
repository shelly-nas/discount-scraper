import JsonDataContext from "../data/JsonDataContext";
import { DiscountModel } from "../models/DiscountModel";
import { logger } from "../utils/Logger";

class DiscountController {
  private context: JsonDataContext<DiscountModel>;

  constructor(context: JsonDataContext<DiscountModel>) {
    this.context = context;
  }

  async exists(): Promise<void> {
    logger.debug("Checking if the discount database exist.");
    return await this.context.exists();
  }

  async getDiscounts(): Promise<DiscountModel[]> {
    logger.info("Fetching all discounts.");
    return await this.context.load();
  }

  async addDiscount(
    productId: number,
    originalPrice: number,
    discountPrice: number,
    specialDiscount: string
  ): Promise<void> {
    const discounts = await this.context.load();
    
    const discount = new DiscountModel(
      productId,
      originalPrice,
      discountPrice,
      specialDiscount
    );
    discounts.push(discount);

    await this.context.save(discounts);
    logger.debug(`New discount added for product ID '${productId}'.`);
  }
}

export default DiscountController;
