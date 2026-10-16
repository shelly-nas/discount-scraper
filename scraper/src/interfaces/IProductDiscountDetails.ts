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
}
