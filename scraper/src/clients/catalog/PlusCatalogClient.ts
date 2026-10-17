import CatalogClient from "./CatalogClient";
import { ICatalogProduct } from "../../interfaces/ICatalogProduct";
import { unitPriceText } from "../../utils/Quantity";
import { scraperLogger } from "../../utils/Logger";
import PlusSite, {
  PlusProduct,
  plusCategory,
  plusImageUrl,
  plusPrice,
  plusProductUrl,
  plusQuantity,
  plusUnitSize,
} from "../plus/PlusSite";

/** Maps one PLUS product to the catalog shape; null when it has no usable price. */
export function mapPlusProduct(product: PlusProduct): ICatalogProduct | null {
  const name = product.Name?.trim();
  const price = plusPrice(product.OriginalPrice);
  if (!name || !product.SKU || price === null || product.IsAvailable === false) return null;

  const quantity = plusQuantity(product);
  return {
    externalId: product.SKU,
    name,
    brand: product.Brand?.trim() || null,
    category: plusCategory(product),
    unitSize: plusUnitSize(product),
    quantity,
    price,
    priceSource: "supermarket",
    unitPrice: unitPriceText(price, quantity),
    imageUrl: plusImageUrl(product),
    productUrl: plusProductUrl(product),
  };
}

class PlusCatalogClient extends CatalogClient {
  readonly supermarket = "PLUS";

  private createSite: () => PlusSite;

  constructor(createSite: () => PlusSite = () => new PlusSite()) {
    super();
    this.createSite = createSite;
  }

  async fetchCatalog(onPage: (products: ICatalogProduct[]) => Promise<void>): Promise<void> {
    const site = this.createSite();
    try {
      await site.open();
      const total = await site.forEachPage("", async (products) => {
        const mapped = products.map(mapPlusProduct).filter((p): p is ICatalogProduct => p !== null);
        if (mapped.length > 0) await onPage(mapped);
      });
      if (total === 0) throw new Error("PLUS: the assortment returned no products");
      scraperLogger.info(`PLUS catalog: ${total} products`);
    } finally {
      await site.close();
    }
  }
}

export default PlusCatalogClient;
