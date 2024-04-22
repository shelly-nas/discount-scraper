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
        `Error converting grocery discounts for '${groceryDiscounts.groceryName}': ${error}`
      );
      process.exit(1);
    }
  }

  private addHeading3(richText: string) {
    const newHeading = new Heading3([new RichText(richText)]);
    this.blocks.push(newHeading);
    logger.debug(`Heading added to the Notion page blocks.`);
  }

  private addTodo(richText: string) {
    const newTodo = new Todo([new RichText(richText)]);
    this.blocks.push(newTodo);
    logger.debug(`Todo added to the Notion page blocks.`);
  }

  private addDivider() {
    this.blocks.push(new Divider());
    logger.debug("Divider added to the Notion page blocks.");
  }

  public toDatabaseEntries(
    groceryDiscounts: IGroceryDiscounts
  ): IProductDiscountDatabase[] {
    try {
      logger.debug(
        `Starting conversion of grocery discount for '${groceryDiscounts.groceryName}'.`
      );

      let entries: IProductDiscountDatabase[] = [];

      // Converting each product discount to a Notion database entry format and adding it to entries.
      for (const productDiscount of groceryDiscounts.discounts) {
        const entry = this.toDatabaseEntry(
          groceryDiscounts.groceryName,
          productDiscount
        );
        entries.push(entry);
      }

      logger.info(
        `Converted grocery discount for '${groceryDiscounts.groceryName}' to Notion database entries.`
      );
      return entries;
    } catch (error) {
      logger.error(
        `Error converting grocery discount for '${groceryDiscounts.groceryName}': ${error}`
      );
      process.exit(1);
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
    logger.debug(`Title created for Notion database entry.`);
    return new Title([new RichText(richText)]);
  }

  private addNumber(number: number): INumber {
    logger.debug(`Number created for Notion database entry.`);
    return new Number(number);
  }

  private addText(richText: string): IText {
    logger.debug(`Text created for Notion database entry.`);
    return new Text([new RichText(richText)]);
  }

  private addSelect(select: string): ISelect {
    logger.debug(`Select created for Notion database entry.`);
    return new Select(select);
  }
}
