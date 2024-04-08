interface ProductDetails {
    initialPrice: string;
    discountPrice: string;
    discountException: string;
}

interface Discounts {
    current: string;
    expireData: string;
    product: ProductDetails;
}

interface Grocery {
    name: string;
    url: string;
    cookieDecline: string;
    productCategories: string[];
    discounts: Discounts;
}