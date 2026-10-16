import { AxiosInstance } from "axios";
import CatalogClient from "./CatalogClient";
import { ICatalogProduct } from "../../interfaces/ICatalogProduct";
import JumboGraphql, { JumboProduct, jumboProductUrl, jumboQuantity, unitPriceText } from "../jumbo/JumboGraphql";

/** Maps one Jumbo product to the catalog shape; null when it has no usable price. */
export function mapJumboProduct(product: JumboProduct): ICatalogProduct | null {
  const cents = product.price?.price;
  if (typeof cents !== "number" || cents <= 0 || !product.title || !product.sku) return null;
  if (product.inAssortment === false) return null;

  const price = cents / 100;
  const quantity = jumboQuantity(product);
  return {
    externalId: product.sku,
    name: product.title.trim(),
    brand: product.brand?.trim() || null,
    category: product.category?.trim() || "Overig",
    unitSize: product.subtitle?.trim() || null,
    quantity,
    price,
    priceSource: "supermarket",
    // Jumbo's own price per unit follows the promotion price; the catalog
    // shows the regular one.
    unitPrice: unitPriceText(price, quantity),
    imageUrl: product.image ?? null,
    productUrl: jumboProductUrl(product),
  };
}

class JumboCatalogClient extends CatalogClient {
  readonly supermarket = "Jumbo";

  private api: JumboGraphql;

  constructor(http?: AxiosInstance) {
    super();
    this.api = new JumboGraphql(http);
  }

  async fetchCatalog(onPage: (products: ICatalogProduct[]) => Promise<void>): Promise<void> {
    await this.api.forEachPage(async (products) => {
      const mapped = products.map(mapJumboProduct).filter((p): p is ICatalogProduct => p !== null);
      if (mapped.length > 0) await onPage(mapped);
    });
  }
}

export default JumboCatalogClient;
