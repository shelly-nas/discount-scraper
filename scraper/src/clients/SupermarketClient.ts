import { logger } from "../utils/Logger";
import { ElementHandle } from "puppeteer";
import WebClient from "./WebClient";
import DateTimeHandler from "../utils/DateTimeHandler";

abstract class SupermarketClient extends WebClient {
  abstract name: string;
  protected expireDate: string = "";
  private productCategory: ElementHandle<Element> | null | undefined;
  private cachedCategoryName: string = ""; // Cache for current category name

  public async getPromotionExpireDate(selector: string): Promise<void> {
    try {
      await this.page?.waitForNetworkIdle({ timeout: 30000 });
      const expireStringRaw = await this.page?.$eval(
        selector,
        (el) => el.textContent
      );
      if (!expireStringRaw) {
        logger.warn(`No promotion expire date found for '${selector}'.`);
        return;
      }

      // Extract the substring after "t/m"
      const tmIndex = expireStringRaw.indexOf("t/m");
      let expireDateRaw = "";
      if (tmIndex === -1) {
        logger.warn(
          `No "t/m" found in promotion expire date: '${expireStringRaw}'`
        );
        expireDateRaw = expireStringRaw;
      } else {
        expireDateRaw = expireStringRaw.substring(tmIndex + 3).trim(); // +3 to skip over "t/m"
      }

      this.expireDate = DateTimeHandler.parseDateISOString(expireDateRaw);
      logger.info(`Promotion Expire Date: ${this.expireDate}`);
    } catch (error) {
      logger.error("Failed to get promotion expire date:", error);
      process.exit(1);
    }
  }

  public async getDiscountProductsByProductCategory(
    parentSelector: string,
    productSelector: string
  ): Promise<ElementHandle[] | undefined> {
    logger.debug(
      `Wait for product category with ID '${parentSelector}' to be visible.`
    );
    await this.page?.waitForNetworkIdle({ timeout: 30000 });
    let discountProducts;

    try {
      // Check if the selector is a text-based selector (for sections with h2 headers)
      // If it doesn't start with # or . or contain [, it's likely a text selector
      const isTextSelector =
        !parentSelector.match(/^[#.\[]/) && !parentSelector.includes(":");

      if (isTextSelector) {
        // Find section by h2 text content
        this.productCategory = await this.findSectionByHeaderText(
          parentSelector
        );
        // Cache the category name for this section (it's the same for all products)
        this.cachedCategoryName = parentSelector
          .trim()
          .replace(/,/g, "")
          .replace(/& /g, "");
      } else {
        // Use regular CSS selector
        this.productCategory = await this.page?.$(parentSelector);
        // Clear cache, will need to fetch from DOM
        this.cachedCategoryName = "";
      }

      if (!this.productCategory) {
        logger.error(`Section with selector '${parentSelector}' not found.`);
        return;
      }

      // If we don't have a cached category name yet, fetch it now (once for all products)
      if (!this.cachedCategoryName) {
        const categoryHandle = await this.productCategory.$("h2, h3");
        if (categoryHandle) {
          this.cachedCategoryName = await categoryHandle.evaluate(
            (el) =>
              el.textContent?.trim().replace(/,/g, "").replace(/& /g, "") || ""
          );
        }
      }

      discountProducts = await this.productCategory.$$(productSelector);
      logger.info(
        `Found ${discountProducts.length} elements for discount products under the parent selector '${parentSelector}'.`
      );
    } catch (error) {
      logger.error(
        `Error finding elements for discount products with selector '${productSelector}':`,
        error
      );
    }

    return discountProducts;
  }

  /**
   * Finds a section element by searching for an h2 header with matching text
   * Works for both Dirk (section.department > h2) and Plus (div.ThemeGrid_Container > h2 > span)
   */
  private async findSectionByHeaderText(
    headerText: string
  ): Promise<ElementHandle | null | undefined> {
    logger.debug(`Finding section with h2 text: "${headerText}"`);

    const section = await this.page?.evaluateHandle((text: string) => {
      // Try Dirk's structure first: section.department > h2
      let sections = Array.from(
        document.querySelectorAll("section.department")
      );
      for (const section of sections) {
        const h2 = section.querySelector("h2");
        if (h2 && h2.textContent?.trim() === text) {
          return section;
        }
      }

      // Try Plus's structure: div.ThemeGrid_Container > h2.promo-category-offer > span
      const containers = Array.from(
        document.querySelectorAll("div.ThemeGrid_Container")
      );
      for (const container of containers) {
        const span = container.querySelector(
          "h2.promo-category-offer > span[data-expression]"
        );
        if (span && span.textContent?.trim() === text) {
          return container;
        }
      }

      return null;
    }, headerText);

    if (section && section.asElement()) {
      logger.debug(`Found section with h2 text: "${headerText}"`);
      return section.asElement() as ElementHandle;
    }

    logger.warn(`No section found with h2 text: "${headerText}"`);
    return null;
  }

  public async getDiscountProductDetails(
    productElement: ElementHandle,
    productConfig: IProductDetails
  ): Promise<IProductDiscountDetails> {
    // Get all product data in a single browser call for maximum performance
    const productData = await this.extractProductData(
      productElement,
      productConfig
    );

    // Use cached category name (already fetched once per category section)
    const category = this.cachedCategoryName || "";

    const productDiscountDetails = {
      name: productData.name,
      originalPrice: productData.originalPrice,
      discountPrice: productData.discountPrice,
      specialDiscount: productData.specialDiscount,
      category,
      supermarket: this.name,
      expireDate: this.expireDate,
    };

    logger.info(
      `Product details scraped for '${productDiscountDetails.name}'.`
    );

    return productDiscountDetails;
  }

  /**
   * Extracts all product data in a single browser call for optimal performance.
   * This method should be overridden by child classes to handle supermarket-specific logic.
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
    // Default implementation - child classes should override this
    const productData = await productElement.evaluate(
      (element: Element, config) => {
        // Product name
        const nameElement = element.querySelector(config.productName[0]);
        const name = nameElement?.textContent?.trim() || "";

        // Original price - default implementation (may need override)
        let originalPrice = 0;

        // Discount price - default implementation (may need override)
        let discountPrice = 0;

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

  protected async getProductCategoryName(
    productCategorySelector: string[]
  ): Promise<string> {
    try {
      const productCategoryHandle = await this.productCategory?.$(
        productCategorySelector[0]
      );
      let productCategoryName = "";

      if (productCategoryHandle) {
        productCategoryName = await productCategoryHandle.evaluate(
          (el) => el.textContent || ""
        );
      }

      logger.debug(
        `Product category name retrieved: '${productCategoryName}'.`
      );
      return productCategoryName.trim().replace(/,/g, "").replace(/& /g, "");
    } catch (error) {
      logger.error(
        `Error retrieving product name with selector '${this.productCategory}':`,
        error
      );
      return "";
    }
  }

  protected async getProductName(
    anchorHandle: ElementHandle,
    productNameSelector: string[]
  ): Promise<string> {
    try {
      const productName =
        (await anchorHandle.$eval(productNameSelector[0], (el) =>
          el.textContent?.trim()
        )) || "";
      logger.debug(`Product name retrieved: '${productName}'.`);
      return productName.trim();
    } catch (error) {
      logger.error(
        `Error retrieving product name with selector '${productNameSelector[0]}':`,
        error
      );
      return "";
    }
  }

  abstract getOriginalPrice(
    anchorHandle: ElementHandle,
    originalPriceSelector: string[]
  ): Promise<number>;

  abstract getDiscountPrice(
    anchorHandle: ElementHandle,
    discountPriceSelector: string[]
  ): Promise<number>;

  protected async getSpecialDiscount(
    anchorHandle: ElementHandle,
    specialDiscountSelector: string[]
  ): Promise<string> {
    try {
      const specialDiscount = await anchorHandle.$$eval(
        specialDiscountSelector[0],
        (spans) =>
          spans
            .map((span) => span.textContent)
            .filter(Boolean)
            .join(" ")
      );
      logger.debug(`Special discount text retrieved: '${specialDiscount}'.`);
      return specialDiscount.trim();
    } catch (error) {
      logger.warn(
        `Warn retrieving special discount text with selector '${specialDiscountSelector[0]}':`,
        error
      );
      return "";
    }
  }
}

export default SupermarketClient;
