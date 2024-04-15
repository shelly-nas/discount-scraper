export default class GroceryDiscounts {
    private groceryName: string;
    public discounts: Discount[] = [];

    constructor (groceryName: string) {
        this.groceryName = groceryName;
    }

    public appendDiscount(newDiscount: Discount): void {
        this.discounts.push(newDiscount);
    }

    public exportAsObject(): object {
        return {
            groceryName: this.groceryName,
            discounts: this.discounts.map(discount => ({
                productCategory: discount.productCategory,
                productName: discount.productName,
                initialPrice: discount.initialPrice,
                discountPrice: discount.discountPrice,
                specialDiscount: discount.specialDiscount
            }))
        };
    }
}
