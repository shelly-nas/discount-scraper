import { ElementHandle } from "puppeteer";
import SupermarketClient from "./SupermarketClient";
import { logger } from "../../utils/Logger";

class PlusClient extends SupermarketClient {
  public name: string = "PLUS";

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
        const originalPriceElement = element.querySelector(
          config.originalPrice[0]
        );
        if (originalPriceElement && originalPriceElement.textContent) {
          originalPrice = parseFloat(originalPriceElement.textContent.trim());
        }

        // Discount price
        const euros =
          element.querySelector(config.discountPrice[0])?.textContent || "";
        const cents =
          element.querySelector(config.discountPrice[1])?.textContent || "";
        const discountPrice = parseFloat(`${euros}${cents}`);

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
      const price = await anchorHandle.$eval(
        originalPriceSelector[0],
        (span) => span.textContent
      );

      logger.debug(`Original price retrieved: '${price}'.`);
      return price !== null ? parseFloat(price.trim()) : 0;
    } catch (error) {
      logger.warn(
        `Warn retrieving original price with selector '${originalPriceSelector[0]}':`,
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
      const price = await anchorHandle.evaluate(
        (node: Element, selectors: string[]) => {
          const euros = node.querySelector(selectors[0])?.textContent || "";
          const cents = node.querySelector(selectors[1])?.textContent || "";
          return `${euros}${cents}`;
        },
        discountPriceSelector
      );

      logger.debug(`Discount price retrieved: '${price}'.`);
      return price !== null ? parseFloat(price.trim()) : 0;
    } catch (error) {
      logger.warn(
        `Warn retrieving discount price with selector '${discountPriceSelector[1]}':`,
        error
      );
      return 0;
    }
  }
}

export default PlusClient;
