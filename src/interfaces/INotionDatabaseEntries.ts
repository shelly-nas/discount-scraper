// interface IProperties {
//   type: string;
// }

interface IRichText {
  type: string;
  text: IContent;
}

interface IContent {
  content: string;
}

interface ITitle {
  type: string,
  title: IRichText[];
}

interface INumber {
  type: string,
  number: number;
}

interface IText {
  rich_text: IRichText[];
}

interface ISelect {
  type: string,
  select: { name: string };
}

interface IProductDiscountDatabase {
  ProductName: ITitle;
  OriginalPrice: INumber;
  DiscountPrice: INumber;
  SpecialDiscount: IText;
  ProductCategory: ISelect;
  Supermarket: ISelect;
}
