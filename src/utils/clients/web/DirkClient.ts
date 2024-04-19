import { ElementHandle } from "playwright";
import GroceryClient from "./GroceryClient";
import { logger } from "../../helpers/Logger";

class DirkClient extends GroceryClient {
  constructor() {
    super();
    logger.info("Created a Dirk Grocery Client instance.");
  }

  public async getOriginalPrice(
    anchorHandle: ElementHandle,
    originalPriceSelector: string[]
  ): Promise<string> {
    try {
      // Directly retrieve the nested content if the structure and access pattern are consistent and predictable
      const price = await anchorHandle.$$eval(
        originalPriceSelector[0],
        (elements, selector) => {
          return elements
            .map((element) => {
              const span = element.querySelector(selector);
              return span ? span.textContent : "";
            })
            .join("");
        },
        originalPriceSelector[1]
      ); // Passing the second selector part as an argument to the page function
      logger.debug(`Original price retrieved: '${price}'.`);
      return price.trim();
    } catch (error) {
      logger.warn(
        `Warn retrieving original price with selector '${originalPriceSelector.join(
          " > "
        )}':`,
        error
      );
      return "";
    }
  }

  public async getDiscountPrice(
    anchorHandle: ElementHandle,
    discountPriceSelector: string[]
  ): Promise<string> {
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
      return price.trim();
    } catch (error) {
      logger.warn(
        `Warn retrieving discount price with selector '${discountPriceSelector.join(
          ", "
        )}':`,
        error
      );
      return "";
    }
  }
}

export default DirkClient;
