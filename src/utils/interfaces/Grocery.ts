interface ProductDetails {
    productName: string[];
    initialPrice: string[];
    discountPrice: string[];
    discountException: string[];
}

interface ProductDiscounts {
    name: string;
    product: ProductDetails;
}

interface Grocery {
    name: string;
    url: string;
    cookieDecline: string;
    productCategories: string[];
    currentPromotion: string;
    promotionExpireDate: string;
    productDiscounts: ProductDiscounts;
}
