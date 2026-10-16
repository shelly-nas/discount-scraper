import { AxiosInstance } from "axios";
import moment from "moment";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";
import HoogvlietGraphql, {
  HoogvlietListedProduct,
  hoogvlietUnitPrice,
  productUrl,
  promotionPrice,
} from "./hoogvliet/HoogvlietGraphql";

/**
 * Maps a product on promotion to a discount; null when it is not on a current
 * promotion. The discount price is the price per item, also for multi-buy
 * offers such as "3 voor 6,00".
 */
export function mapHoogvlietDiscount(
  product: HoogvlietListedProduct,
  now: Date = new Date()
): IProductDiscountDetails | null {
  const promotion = product.promotion_meta_data;
  if (!product.is_promotion || !promotion?.valid_to) return null;
  const validTo = moment(promotion.valid_to);
  if (!validTo.isValid() || validTo.toDate() <= now) return null;

  const regular = product.price_range?.minimum_price?.regular_price?.value;
  const final = product.price_range?.minimum_price?.final_price?.value ?? regular;
  if (typeof regular !== "number" || typeof final !== "number") return null;

  return {
    name: product.name.trim(),
    originalPrice: regular,
    discountPrice: promotionPrice(promotion.korting_label, regular, final),
    unitPrice: hoogvlietUnitPrice(product.sub_title_attributes),
    specialDiscount: promotion.korting_label?.trim() ?? "",
    category: product.category,
    supermarket: "Hoogvliet",
    expireDate: validTo.toISOString(true),
    productUrl: productUrl(product),
    externalId: product.sku,
  };
}

/**
 * The end of the weekly folder: the most common end date. Some promotions run
 * for months; the latest date would postpone the next scheduled run until then.
 */
export function folderExpireDate(discounts: IProductDiscountDetails[]): string {
  const counts = new Map<string, number>();
  for (const d of discounts) counts.set(d.expireDate, (counts.get(d.expireDate) ?? 0) + 1);
  let best = "";
  let bestCount = 0;
  for (const [date, count] of counts) {
    if (count > bestCount || (count === bestCount && date < best)) {
      best = date;
      bestCount = count;
    }
  }
  return best || moment().endOf("isoWeek").toISOString(true);
}

class HoogvlietApiClient extends ApiClient {
  public name = "Hoogvliet";

  private api: HoogvlietGraphql;

  constructor(http?: AxiosInstance) {
    super();
    this.api = new HoogvlietGraphql(http);
    scraperLogger.debug(`Created a '${this.name}' API Client instance.`);
  }

  public async fetchDiscounts(): Promise<{
    discounts: IProductDiscountDetails[];
    expireDate: string;
  }> {
    scraperLogger.info("Fetching Hoogvliet discounts via the webshop GraphQL API");

    const discounts: IProductDiscountDetails[] = [];
    await this.api.forEachCategory(async (products) => {
      for (const product of products) {
        const discount = mapHoogvlietDiscount(product);
        if (discount) discounts.push(discount);
      }
    });

    const expireDate = folderExpireDate(discounts);
    scraperLogger.info(`Total Hoogvliet discounts: ${discounts.length}, folder expires: ${expireDate}`);
    return { discounts, expireDate };
  }
}

export default HoogvlietApiClient;
