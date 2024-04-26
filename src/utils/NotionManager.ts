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

export default class NotionManager {
  private blocks: IBlock[] = [];

  public querySupermarket(value: string) {
    return {
      property: "Supermarket",
      select: {
        equals: value,
      },
    };
  }

  // public toPageBlocks(groceryDiscounts: IGroceryDiscount): IBlock[] {
  //   try {
  //     this.addHeading3(groceryDiscounts.groceryName);
  //     groceryDiscounts.discounts.forEach((discount) => {
  //       this.addTodo(
  //         `${discount.productName}: ${discount.discountPrice} (${discount.specialDiscount})`
  //       );
  //     });
  //     this.addDivider();

  //     logger.info(
  //       `Converted grocery discounts for '${groceryDiscounts.groceryName}' to Notion page blocks.`
  //     );
  //     return this.blocks;
  //   } catch (error) {
  //     logger.error(
  //       `Error converting grocery discounts for '${groceryDiscounts.groceryName}' to Notion page blocks: ${error}`
  //     );
  //     // Handling error appropriately, here we simply throw it to be dealt by the caller
  //     throw error;
  //   }
  // }

  // private addHeading3(richText: string) {
  //   const newHeading = new Heading3([new RichText(richText)]);
  //   this.blocks.push(newHeading);
  // }

  // private addTodo(richText: string) {
  //   const newTodo = new Todo([new RichText(richText)]);
  //   this.blocks.push(newTodo);
  // }

  // private addDivider() {
  //   this.blocks.push(new Divider());
  // }

  public toDatabaseEntries(
    discounts: IGroceryDiscount[]
  ): IProductDiscountDatabase[] {
    try {
      const discountEntries = discounts.map((discount) =>
        this.toDatabaseEntry(discount)
      );
      logger.info(
        `Converted grocery discounts for '${discounts[0].supermarket}' to Notion database entries.`
      );
      return discountEntries;
    } catch (error) {
      logger.error("Error converting grocery discounts for:", error);
      process.exit(1);
    }
  }

  private toDatabaseEntry(
    discount: IGroceryDiscount
  ): IProductDiscountDatabase {
    const productDiscountEntry: IProductDiscountDatabase = {
      ProductName: this.addTitle(discount.productName),
      OriginalPrice: this.addNumber(discount.originalPrice),
      DiscountPrice: this.addNumber(discount.discountPrice),
      SpecialDiscount: this.addText(discount.specialDiscount),
      ProductCategory: this.addSelect(discount.productCategory),
      Supermarket: this.addSelect(discount.supermarket),
    };
    logger.debug(
      `Created a product discount entry for '${discount.productName}'.`
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
