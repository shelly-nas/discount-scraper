import {
  Heading3,
  Todo,
  RichText,
  Divider,
  Title,
  Text,
  Number,
  Select,
} from "../models/NotionModel";
import { logger } from "./Logger";

export default class NotionConverter {
  private blocks: IBlock[] = [];

  public querySupermarket(value: string) {
    return {
      property: "Supermarket",
      select: {
        equals: value
      }
    }
  }
  
  public toPageBlocks(groceryDiscounts: IGroceryDiscounts): IBlock[] {
    try {
      this.addHeading3(groceryDiscounts.groceryName);
      groceryDiscounts.discounts.forEach((discount) => {
        this.addTodo(
          `${discount.productName}: ${discount.discountPrice} (${discount.specialDiscount})`
        );
      });
      this.addDivider();

      logger.info(
        `Converted grocery discounts for '${groceryDiscounts.groceryName}' to Notion page blocks.`
      );
      return this.blocks;
    } catch (error) {
      logger.error(
        `Error converting grocery discounts for '${groceryDiscounts.groceryName}' to Notion page blocks: ${error}`
      );
      // Handling error appropriately, here we simply throw it to be dealt by the caller
      throw error;
    }
  }

  private addHeading3(richText: string) {
    const newHeading = new Heading3([new RichText(richText)]);
    this.blocks.push(newHeading);
  }

  private addTodo(richText: string) {
    const newTodo = new Todo([new RichText(richText)]);
    this.blocks.push(newTodo);
  }

  private addDivider() {
    this.blocks.push(new Divider());
  }

  public toDatabaseEntries(
    groceryDiscounts: IGroceryDiscounts
  ): IProductDiscountDatabase[] {
    try {
      const entries = groceryDiscounts.discounts.map((productDiscount) =>
        this.toDatabaseEntry(groceryDiscounts.groceryName, productDiscount)
      );

      logger.info(
        `Converted grocery discounts for '${groceryDiscounts.groceryName}' to Notion database entries.`
      );
      return entries;
    } catch (error) {
      logger.error(
        `Error converting grocery discounts for '${groceryDiscounts.groceryName}': ${error}`
      );
      throw error; // Rethrow the error to let the caller handle it
    }
  }

  private toDatabaseEntry(
    groceryName: string,
    productDiscount: IProductDiscount
  ): IProductDiscountDatabase {
    const productDiscountEntry: IProductDiscountDatabase = {
      ProductName: this.addTitle(productDiscount.productName),
      OriginalPrice: this.addNumber(productDiscount.originalPrice),
      DiscountPrice: this.addNumber(productDiscount.discountPrice),
      SpecialDiscount: this.addText(productDiscount.specialDiscount),
      ProductCategory: this.addSelect(productDiscount.productCategory),
      Supermarket: this.addSelect(groceryName),
    };
    logger.debug(
      `Created a product discount entry for '${productDiscount.productName}'.`
    );
    return productDiscountEntry;
  }

  public addTitle(richText: string): ITitle {
    return new Title([new RichText(richText)]);
  }

  private addNumber(number: number): INumber {
    return new Number(number);
  }

  private addText(richText: string): IText {
    return new Text([new RichText(richText)]);
  }

  private addSelect(select: string): ISelect {
    return new Select(select);
  }
}
