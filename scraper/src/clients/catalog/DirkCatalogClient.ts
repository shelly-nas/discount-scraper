import { AxiosInstance } from "axios";
import CatalogClient from "./CatalogClient";
import { ICatalogProduct } from "../../interfaces/ICatalogProduct";
import { unitPriceText } from "../../utils/Quantity";
import DirkGraphql, { DirkProduct, dirkImageUrl, dirkProductUrl, dirkQuantity } from "../dirk/DirkGraphql";

/** Maps one Dirk product to the catalog shape; null when it has no usable price. */
export function mapDirkProduct(product: DirkProduct): ICatalogProduct | null {
  const info = product.productInformation;
  const name = info?.headerText?.trim();
  const price = product.normalPrice;
  if (!name || typeof price !== "number" || price <= 0) return null;

  const quantity = dirkQuantity(product);
  return {
    externalId: String(product.productId),
    name,
    brand: info?.brand?.trim() || null,
    category: info?.department?.trim() || "Overig",
    unitSize: info?.packaging?.trim() || null,
    quantity,
    price,
    priceSource: "supermarket",
    unitPrice: unitPriceText(price, quantity),
    imageUrl: dirkImageUrl(product),
    productUrl: dirkProductUrl(product),
  };
}

class DirkCatalogClient extends CatalogClient {
  readonly supermarket = "Dirk";

  private api: DirkGraphql;

  constructor(http?: AxiosInstance) {
    super();
    this.api = new DirkGraphql(http);
  }

  async fetchCatalog(onPage: (products: ICatalogProduct[]) => Promise<void>): Promise<void> {
    await this.api.forEachWebGroup(async (products) => {
      const mapped = products.map(mapDirkProduct).filter((p): p is ICatalogProduct => p !== null);
      if (mapped.length > 0) await onPage(mapped);
    });
  }
}

export default DirkCatalogClient;
