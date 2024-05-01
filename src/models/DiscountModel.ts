export class DiscountModel {
    product: number; // Index fo ProductModel
    originalPrice: number;
    discountPrice: number;
    specialDiscount: string;

    constructor(product: number, originalPrice: number, discountPrice: number, specialDiscount: string, id?: number) {
        this.product = product;
        this.originalPrice = originalPrice;
        this.discountPrice = discountPrice;
        this.specialDiscount = specialDiscount;
    }
}
