import { ElementHandle } from "puppeteer";
import SupermarketClient from "./SupermarketClient";
import { logger } from "../../utils/Logger";

class DirkClient extends SupermarketClient {
  public name: string = "Dirk";

  constructor() {
    super();
    logger.debug(`Created a '${this.name}' Supermarket Client instance.`);
  }

  /**
   * Optimized method to extract all product data in a single browser call
   */
  protected async extractProductData(
    productElement: ElementHandle,
    productConfig: IProductDetails
  ): Promise<{
    name: string;
    originalPrice: number;
    discountPrice: number;
    specialDiscount: string;
  }> {
    const productData = await productElement.evaluate(
      (element: Element, config) => {
        // Product name
        const nameElement = element.querySelector(config.productName[0]);
        const name = nameElement?.textContent?.trim() || "";

        // Original price
        let originalPrice = 0;
        const priceLabels = Array.from(
          element.querySelectorAll(config.originalPrice[0])
        );
        for (const label of priceLabels) {
          const span = label.querySelector(config.originalPrice[1]);
          if (span && span.textContent) {
            originalPrice = parseFloat(span.textContent.trim());
            break;
          }
        }

        // Discount price
        const euros =
          element.querySelector(config.discountPrice[0])?.textContent || "0";
        const cents =
          element.querySelector(config.discountPrice[1])?.textContent ||
          element.querySelector(config.discountPrice[2])?.textContent ||
          "00";
        const discountPrice = parseFloat(`${euros}.${cents}`);

        // Special discount
        const specialDiscountElements = Array.from(
          element.querySelectorAll(config.specialDiscount[0])
        );
        const specialDiscount = specialDiscountElements
          .map((el) => el.textContent)
          .filter(Boolean)
          .join(" ")
          .trim();

        return {
          name,
          originalPrice,
          discountPrice,
          specialDiscount,
        };
      },
      productConfig
    );

    return productData;
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
            .map((el) => {
              const span = el.querySelector(selector);
              return span ? span.textContent : null;
            })
            .find((textContent) => textContent !== null); // Find the first non-null textContent
        },
        originalPriceSelector[1]
      ); // Passing the second selector part as an argument to the evaluator function
      logger.debug(`Original price retrieved: '${price}'.`);
      return price ? parseFloat(price.trim()) : 0; // Parse the price or return 0 if null
    } catch (error) {
      logger.warn(
        `Warning retrieving original price with selector '${originalPriceSelector.join(
          " > "
        )}':`,
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
