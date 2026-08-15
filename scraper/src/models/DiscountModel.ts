export class DiscountModel {
  product: number; // Index fo ProductModel
  originalPrice: number;
  discountPrice: number;
  unitPrice: string | null;
  specialDiscount: string;
  expireDate: string;
  active: boolean;

  constructor(
    product: number,
    originalPrice: number,
    discountPrice: number,
    unitPrice: string | null,
    specialDiscount: string,
    expireDate: string,
    active: boolean = true
  ) {
    this.product = product;
    this.originalPrice = originalPrice;
    this.discountPrice = discountPrice;
    this.unitPrice = unitPrice;
    this.specialDiscount = specialDiscount;
    this.expireDate = expireDate;
    this.active = active;
  }
}
