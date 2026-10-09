/** One product from a supermarket's full assortment, at its regular price. */
export interface ICatalogProduct {
  /** The supermarket's own product id (stable across runs). */
  externalId: string;
  name: string;
  brand: string | null;
  category: string;
  /** Pack size as shown by the supermarket, e.g. "1 l" or "500 g". */
  unitSize: string | null;
  /** Regular shelf price, without any promotion. */
  price: number;
  /** Price per unit as shown by the supermarket, e.g. "€1.09 per liter". */
  unitPrice: string | null;
  imageUrl: string | null;
  productUrl: string | null;
}
