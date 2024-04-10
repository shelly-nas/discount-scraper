export default class GroceryDiscounts {
    private groceryName: string;
    public productCategory!: string;
    public discounts: ProductDiscount[] = [];

    constructor (groceryName: string) {
        this.groceryName = groceryName;
    }

    public appendDiscount(newDiscount: ProductDiscount): void {
        this.discounts.push(newDiscount);
    }

    public exportAsObject(): object {
        return {
            groceryName: this.groceryName,
            discounts: this.discounts.map(discount => ({
                productCategory: this.productCategory,
                productName: discount.productName,
                initialPrice: discount.initialPrice,
                discountPrice: discount.discountPrice,
                specialDiscount: discount.specialDiscount
            }))
        };
    }
}
