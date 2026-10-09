import { ICatalogProduct } from "../../interfaces/ICatalogProduct";

/**
 * Fetches a supermarket's full assortment at regular prices.
 *
 * Results are delivered page by page through [onPage] so a catalog of tens of
 * thousands of products never has to be held in memory at once. Implementations
 * may deliver the same product twice (e.g. listed in two categories); the
 * storage layer deduplicates on externalId.
 */
abstract class CatalogClient {
  abstract readonly supermarket: string;

  abstract fetchCatalog(
    onPage: (products: ICatalogProduct[]) => Promise<void>
  ): Promise<void>;
}

export default CatalogClient;
