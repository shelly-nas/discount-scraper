interface IProductDetails {
  productCategory: string[];
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
  promotionProducts: IProductDetails;
}

interface ISupermarketWebConfig {
  name: string;
  nameShort: string;
  url: string;
  webIdentifiers: IWebIdentifiers;
}
