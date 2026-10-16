import { AxiosInstance } from "axios";
import CatalogClient from "./CatalogClient";
import { ICatalogProduct } from "../../interfaces/ICatalogProduct";
import HoogvlietGraphql, {
  HoogvlietListedProduct,
  hoogvlietQuantity,
  hoogvlietUnitPrice,
  hoogvlietUnitSize,
  productUrl,
} from "../hoogvliet/HoogvlietGraphql";

/** Maps one Hoogvliet product to the catalog shape; null when it has no usable price. */
export function mapHoogvlietProduct(product: HoogvlietListedProduct): ICatalogProduct | null {
  const price = product.price_range?.minimum_price?.regular_price?.value;
  if (typeof price !== "number" || price <= 0 || !product.name || !product.sku) return null;
  const sub = product.sub_title_attributes;

  return {
    externalId: product.sku,
    name: product.name.trim(),
    brand: null,
    category: product.category,
    unitSize: hoogvlietUnitSize(sub),
    quantity: hoogvlietQuantity(sub),
    price,
    priceSource: "supermarket",
    unitPrice: hoogvlietUnitPrice(sub),
    imageUrl: product.small_image?.url ?? null,
    productUrl: productUrl(product),
  };
}

class HoogvlietCatalogClient extends CatalogClient {
  readonly supermarket = "Hoogvliet";

  private api: HoogvlietGraphql;

  constructor(http?: AxiosInstance) {
    super();
    this.api = new HoogvlietGraphql(http);
  }

  async fetchCatalog(onPage: (products: ICatalogProduct[]) => Promise<void>): Promise<void> {
    await this.api.forEachCategory(async (products) => {
      const mapped = products
        .map(mapHoogvlietProduct)
        .filter((p): p is ICatalogProduct => p !== null);
      if (mapped.length > 0) await onPage(mapped);
    });
  }
}

export default HoogvlietCatalogClient;
