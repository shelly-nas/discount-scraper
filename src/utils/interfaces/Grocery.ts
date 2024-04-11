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

interface Grocery {
    name: string;
    url: string;
    webIdentifiers: WebIdentifiers;
}
