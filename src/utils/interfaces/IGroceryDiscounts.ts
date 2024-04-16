interface IGroceryDiscounts {
    groceryName: string;
    discounts: IProductDiscount[];
}

interface IProductDiscount {
    productCategory: string;
    productName: string;
    initialPrice?: string;
    discountPrice?: string;
    specialDiscount?: string;
}