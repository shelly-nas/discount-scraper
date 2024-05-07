import { Select, Title, Number, Text, Date } from "../models/NotionModel";

export interface IProductDiscountDatabase {
  ProductName: Title;
  OriginalPrice: Number;
  DiscountPrice: Number;
  SpecialDiscount: Text;
  ProductCategory: Select;
  Supermarket: Select;
  ExpireDate: Date;
}
