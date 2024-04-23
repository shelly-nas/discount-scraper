import { ElementHandle } from "playwright";
import GroceryClient from "./GroceryClient";
import { logger } from "../../utils/Logger";

class DirkClient extends GroceryClient {
  constructor() {
    super();
    logger.info("Created a Dirk Grocery Client instance.");
  }
  
  public async getOriginalPrice(
    anchorHandle: ElementHandle,
    originalPriceSelector: string[]
  ): Promise<number> {
    try {
      // Directly retrieve the nested content if the structure and access pattern are consistent and predictable
      const price: string | null | undefined = await anchorHandle.$$eval(
        originalPriceSelector[0],
        (elements, selector) => {
          return elements
            .map((element) => {
              const span = element.querySelector(selector);
              return span ? span.textContent : null;
            })
            .find(textContent => textContent !== null); // Find the first non-null textContent
        },
        originalPriceSelector[1]
      ); // Passing the second selector part as an argument to the evaluator function
      logger.debug(`Original price retrieved: '${price}'.`);
      return price ? parseFloat(price.trim()) : 0; // Parse the price or return 0 if null
    } catch (error) {
      logger.warn(
        `Warning retrieving original price with selector '${originalPriceSelector.join(" > ")}':`,
        error
      );
      return 0;
    }
  }

  public async getDiscountPrice(
    anchorHandle: ElementHandle,
    discountPriceSelector: string[]
  ): Promise<number> {
    try {
      // Concatenate the euro and cent values directly within a single evaluate to minimize calls to the browser context
      const price = await anchorHandle.evaluate((node: Element, selectors) => {
        const euros = node.querySelector(selectors[0])?.textContent || "0";
        let cents =
          node.querySelector(selectors[1])?.textContent ||
          node.querySelector(selectors[2])?.textContent ||
          "00";
        return `${euros}.${cents}`;
      }, discountPriceSelector);
      logger.debug(`Discount price retrieved: '${price}'.`);
      return parseFloat(price.trim());
    } catch (error) {
      logger.warn(
        `Warn retrieving discount price with selector '${discountPriceSelector.join(
          ", "
        )}':`,
        error
      );
      return 0;
    }
  }
}

export default DirkClient;
