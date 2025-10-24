import { Locator } from "playwright";
import SupermarketClient from "./SupermarketClient";
import { scraperLogger } from "../utils/Logger";

class AhClient extends SupermarketClient {
  public name: string = "Albert Heijn";

  constructor() {
    super();
    scraperLogger.debug(`Created a '${this.name}' Supermarket Client instance.`);
  }

  /**
   * Optimized method to extract all product data in a single browser call
   */
  protected async extractProductData(
    productElement: Locator,
    productConfig: IProductDetails
  ): Promise<{
    name: string;
    originalPrice: number;
    discountPrice: number;
    specialDiscount: string;
  }> {
    const productData = await productElement.evaluate(
      (element: Element, config: IProductDetails) => {
        // Product name
        const nameElement = element.querySelector(config.productName[0]);
        const name = nameElement?.textContent?.trim() || "";

        // Original price (from data attribute)
        let originalPrice = 0;
        const originalPriceElement = element.querySelector(
          config.originalPrice[0]
        );
        if (originalPriceElement) {
          const priceStr = originalPriceElement.getAttribute(
            config.originalPrice[1]
          );
          originalPrice = priceStr ? parseFloat(priceStr.trim()) : 0;
        }

        // Discount price (from data attribute)
        let discountPrice = 0;
        const discountPriceElement = element.querySelector(
          config.discountPrice[0]
        );
        if (discountPriceElement) {
          const priceStr = discountPriceElement.getAttribute(
            config.discountPrice[1]
          );
          discountPrice = priceStr ? parseFloat(priceStr.trim()) : 0;
        }

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
    anchorHandle: Locator,
    originalPriceSelector: string[]
  ): Promise<number> {
    try {
      const priceElementHandle = anchorHandle.locator(originalPriceSelector[0]); // Find the child div with the original price
      const exists = await priceElementHandle.count();
      if (!exists) {
        scraperLogger.warn(
          `Original price element with selector '${originalPriceSelector[0]}' not found.`
        );
        return 0;
      }
      const price = await priceElementHandle.getAttribute(
        originalPriceSelector[1]
      );
      scraperLogger.debug(`Original price retrieved: '${price}'.`);
      return price !== null ? parseFloat(price.trim()) : 0;
    } catch (error) {
      scraperLogger.warn(
        `Warn retrieving original price with selector '${originalPriceSelector[1]}':`,
        error
      );
      return 0;
    }
  }

  public async getDiscountPrice(
    anchorHandle: Locator,
    discountPriceSelector: string[]
  ): Promise<number> {
    try {
      const priceElementHandle = anchorHandle.locator(discountPriceSelector[0]); // Find the child div with the discount price
      const exists = await priceElementHandle.count();
      if (!exists) {
        scraperLogger.warn(
          `Discount price element with selector '${discountPriceSelector[0]}' not found.`
        );
        return 0;
      }
      const price = await priceElementHandle.getAttribute(
        discountPriceSelector[1]
      );
      scraperLogger.debug(`Discount price retrieved: '${price}'.`);
      return price !== null ? parseFloat(price.trim()) : 0;
    } catch (error) {
      scraperLogger.warn(
        `Warn retrieving discount price with selector '${discountPriceSelector[1]}':`,
        error
      );
      return 0;
    }
  }
}

export default AhClient;
