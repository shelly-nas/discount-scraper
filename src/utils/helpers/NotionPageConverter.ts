import {
  Heading3,
  Todo,
  RichText,
  Divider,
} from "../objects/NotionPagesBlocks";
import { logger } from "./Logger";

export default class NotionPageConverter {
  getPageBlocks(groceryDiscounts: IGroceryDiscounts): IBlock[] {
    try {
      const blocks: IBlock[] = [];

      logger.debug(
        `Starting conversion of grocery discounts for '${groceryDiscounts.groceryName}'.`
      );

      // Get the name of the grocery store and add it to a heading block
      blocks.push(new Heading3([new RichText(groceryDiscounts.groceryName)]));
      logger.debug(
        `Added store name heading block for '${groceryDiscounts.groceryName}'.`
      );

      // Get all the discounts and add them to a todo block
      groceryDiscounts.discounts.map((discount) => {
        blocks.push(
          new Todo([
            new RichText(
              `${discount.productName} -  € ${discount.discountPrice} (${discount.specialDiscount})`
            ),
          ])
        );
        logger.debug(`Added TODO block for product '${discount.productName}'.`);
      });

      // End the page content with a divider block
      blocks.push(new Divider());
      logger.debug("Added divider at the end of the Notion page content.");

      logger.info(
        `Converted grocery discounts for '${groceryDiscounts.groceryName}' to Notion page blocks.`
      );
      return blocks;
    } catch (error) {
      logger.error(
        `Error converting grocery discounts for '${groceryDiscounts.groceryName}': ${error}`
      );
      process.exit(1);
    }
  }
}
