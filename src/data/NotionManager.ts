import { logger } from "../utils/Logger";
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

  public toPageBlocks(productDiscountsDetails: IProductDiscountDetails[]): IBlock[] {
    try {
      this.addHeading3(productDiscountsDetails[0].supermarket);
      productDiscountsDetails.forEach((discount) => {
        this.addTodo(
          `${discount.name}: ${discount.discountPrice} (${discount.specialDiscount})`
        );
      });
      this.addDivider();

      logger.info(
        `Converted supermarket discounts for '${productDiscountsDetails[0].supermarket}' to Notion page blocks.`
      );
      return this.blocks;
    } catch (error) {
      logger.error(
        `Error converting supermarket discounts for '${productDiscountsDetails[0].supermarket}' to Notion page blocks: ${error}`
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
    productDiscounts: IProductDiscountDetails[]
  ): IProductDiscountDatabase[] {
    try {
      const discountEntries = productDiscounts.map((discount) =>
        this.toDatabaseEntry(discount)
      );
      logger.info(
        `Converted supermarket discounts for '${productDiscounts[0].supermarket}' to Notion database entries.`
      );
      return discountEntries;
    } catch (error) {
      logger.error("Error converting supermarket discounts for:", error);
      process.exit(1);
    }
  }

  private toDatabaseEntry(
    productDiscount: IProductDiscountDetails
  ): IProductDiscountDatabase {
    const productDiscountEntry: IProductDiscountDatabase = {
      ProductName: this.addTitle(productDiscount.name),
      OriginalPrice: this.addNumber(productDiscount.originalPrice),
      DiscountPrice: this.addNumber(productDiscount.discountPrice),
      SpecialDiscount: this.addText(productDiscount.specialDiscount),
      ProductCategory: this.addSelect(productDiscount.category),
      Supermarket: this.addSelect(productDiscount.supermarket),
    };
    logger.debug(
      `Created a product discount entry for '${productDiscount.name}'.`
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
