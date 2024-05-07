export class DiscountModel {
    product: number; // Index fo ProductModel
    originalPrice: number;
    discountPrice: number;
    specialDiscount: string;
    expireDate: string;

    constructor(product: number, originalPrice: number, discountPrice: number, specialDiscount: string, expireDate: string) {
        this.product = product;
        this.originalPrice = originalPrice;
        this.discountPrice = discountPrice;
        this.specialDiscount = specialDiscount;
        this.expireDate = expireDate;
    }
}
