interface DiscountDetails {
    productName: string[];
    initialPrice: string[];
    discountPrice: string[];
    specialDiscount: string[];
}

interface WebIdentifiers {
    cookieDecline: string;
    promotionExpireDate: string;
    productCategories: string[];
    products: string;
    promotionProducts: DiscountDetails;
}

interface GroceryWebStore {
    name: string;
    url: string;
    webIdentifiers: WebIdentifiers;
}
