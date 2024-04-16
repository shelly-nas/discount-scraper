export class GroceryDiscounts {
    public groceryName: string;
    public discounts: ProductDiscount[] = [];

    constructor (groceryName: string, discounts: ProductDiscount[]) {
        this.groceryName = groceryName;
        this.discounts = discounts
    }
}