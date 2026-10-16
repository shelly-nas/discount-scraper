import { AxiosInstance } from "axios";
import moment from "moment";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";
import { folderExpireDate, promotionPrice } from "../utils/Promotion";
import { unitPriceText } from "../utils/Quantity";
import AldiAlgolia, {
  AldiProduct,
  aldiCategory,
  aldiName,
  aldiProductUrl,
  aldiQuantity,
  isAldiOffer,
} from "./aldi/AldiAlgolia";

/**
 * Maps a week offer to a discount. An offer that reuses a regular article id
 * with a leading 9 is linked to that product (and gets its regular price);
 * other offers are articles of their own, linked by their own id. "2 VOOR"
 * with price 2.00 is 1.00 per item.
 */
export function mapAldiDiscount(
  offer: AldiProduct,
  regular: Map<string, AldiProduct>,
  now: Date = new Date()
): IProductDiscountDetails | null {
  const name = aldiName(offer);
  const price = offer.currentPrice;
  if (!name || !price || typeof price.priceValue !== "number" || price.priceValue <= 0) return null;
  if (offer.isAvailable === false || price.validUntil * 1000 < now.getTime()) return null;

  const linkedId = offer.objectID.startsWith("9") && regular.has(offer.objectID.slice(1))
    ? offer.objectID.slice(1)
    : null;
  const regularPrice = linkedId ? regular.get(linkedId)!.currentPrice?.priceValue ?? 0 : 0;

  const label = [price.priceTagLabels?.promoText1, price.priceTagLabels?.promoText2]
    .map((t) => t?.trim())
    .filter(Boolean)
    .join(" ");
  const multiBuy = /^\d+\s*voor$/i.test(label)
    ? promotionPrice(`${label} ${price.priceValue}`, regularPrice || price.priceValue)
    : null;
  const discountPrice = multiBuy ?? price.priceValue;
  const quantity = aldiQuantity(offer);

  return {
    name,
    originalPrice: regularPrice > discountPrice ? regularPrice : 0,
    discountPrice,
    unitPrice: unitPriceText(discountPrice, quantity),
    quantity,
    specialDiscount: label,
    category: aldiCategory(linkedId ? regular.get(linkedId)! : offer),
    supermarket: "Aldi",
    expireDate: moment.unix(price.validUntil).endOf("day").toISOString(true),
    productUrl: aldiProductUrl(offer),
    externalId: linkedId ?? offer.objectID,
  };
}

class AldiApiClient extends ApiClient {
  public name = "Aldi";

  private api: AldiAlgolia;

  constructor(http?: AxiosInstance) {
    super();
    this.api = new AldiAlgolia(http);
    scraperLogger.debug(`Created a '${this.name}' API Client instance.`);
  }

  public async fetchDiscounts(): Promise<{
    discounts: IProductDiscountDetails[];
    expireDate: string;
  }> {
    scraperLogger.info(`Fetching Aldi discounts via the aldi.nl product index`);

    const all = await this.api.all();
    const regular = new Map(all.filter((p) => !isAldiOffer(p)).map((p) => [p.objectID, p]));
    const offers = all.filter(isAldiOffer);

    const now = new Date();
    const discounts = offers
      .map((offer) => mapAldiDiscount(offer, regular, now))
      .filter((d): d is IProductDiscountDetails => d !== null);
    if (discounts.length === 0) throw new Error("Aldi: no current offers found");

    const expireDate = folderExpireDate(discounts);
    scraperLogger.info(
      `Total Aldi discounts: ${discounts.length} of ${offers.length} offers, folder expires: ${expireDate}`
    );
    return { discounts, expireDate };
  }
}

export default AldiApiClient;
