interface IDiscountDetails {
    productName: string[];
    originalPrice: string[];
    discountPrice: string[];
    specialDiscount: string[];
}

interface IWebIdentifiers {
    cookieDecline: string;
    promotionExpireDate: string;
    productCategories: string[];
    products: string;
    promotionProducts: IDiscountDetails;
}

interface IGroceryWebStore {
    name: string;
    url: string;
    webIdentifiers: IWebIdentifiers;
}
