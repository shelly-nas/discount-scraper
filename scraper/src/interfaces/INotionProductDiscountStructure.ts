import { Title, Number, Text, Select, Date } from "../models/NotionDatabaseModel";

export interface INotionProductDiscountStructure {
    ProductName: Title;
    OriginalPrice: Number;
    DiscountPrice: Number;
    SpecialDiscount: Text;
    ProductCategory: Select;
    Supermarket: Select;
    ExpireDate: Date;
  }