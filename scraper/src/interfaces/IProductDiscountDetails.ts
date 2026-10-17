interface IProductDiscountDetails {
  name: string;
  originalPrice: number;
  discountPrice: number;
  unitPrice: string | null;
  specialDiscount: string;
  category: string;
  supermarket: string;
  expireDate: string;
  productUrl: string | null;
  /**
   * The supermarket's own product id, when known. Offers are then linked to
   * the product by this id instead of by name, so products sharing a name
   * (e.g. two pack sizes) stay apart and offers land on the catalog row.
   */
  externalId?: string | null;
  /**
   * Pack quantity (kg, l or stuk) for the price per unit. When left out it is
   * read from the name ("Spekreepjes 2x190 g"); null means unknown.
   */
  quantity?: import("../utils/Quantity").Quantity | null;
  /** Product image at the supermarket; fills in the product's image when it has none yet. */
  imageUrl?: string | null;
  /** Brand, when the offer data has it; used to match the product across supermarkets. */
  brand?: string | null;
  /** Barcode (EAN), when the supermarket publishes it. */
  ean?: string | null;
  /**
   * Permanent article numbers of the product when the offer has its own
   * externalId (Lidl). The offer then lands on the catalog row with one of
   * these article numbers and the same pack quantity.
   */
  articleNumbers?: string[];
  /**
   * The regular shelf price the supermarket shows next to the offer, for a
   * supermarket whose catalog does not publish regular prices (Lidl). Stored
   * as the product's regular price.
   */
  regularPrice?: number | null;
}
