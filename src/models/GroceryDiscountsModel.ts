export class GroceryDiscountsModel {
  public groceryName: string;
  public discounts: IProductDiscount[] = [];

  constructor(groceryName: string, discounts: IProductDiscount[]) {
    this.groceryName = groceryName;
    this.discounts = discounts;
  }
}
