import { scraperLogger } from "../utils/Logger";
import { Locator } from "playwright";
import WebClient from "./WebClient";
import DateTimeHandler from "../utils/DateTimeHandler";

abstract class SupermarketClient extends WebClient {
  abstract name: string;
  protected expireDate: string = "";
  private productCategory: Locator | null | undefined;
  private cachedCategoryName: string = ""; // Cache for current category name

  public async getPromotionExpireDate(selector: string): Promise<void> {
    try {
      const expireStringRaw = await this.page?.locator(selector).textContent();
      if (!expireStringRaw) {
        scraperLogger.warn(`No promotion expire date found for '${selector}'.`);
        return;
      }

      // Extract the substring after "t/m"
      const tmIndex = expireStringRaw.indexOf("t/m");
      let expireDateRaw = "";
      if (tmIndex === -1) {
        scraperLogger.warn(
          `No "t/m" found in promotion expire date: '${expireStringRaw}'`
        );
        expireDateRaw = expireStringRaw;
      } else {
        expireDateRaw = expireStringRaw.substring(tmIndex + 3).trim(); // +3 to skip over "t/m"
      }

      this.expireDate = DateTimeHandler.parseDateISOString(expireDateRaw);
      scraperLogger.info(`Promotion Expire Date: ${this.expireDate}`);
    } catch (error) {
      scraperLogger.error("Failed to get promotion expire date:", error);
      process.exit(1);
    }
  }

  public async getDiscountProductsByProductCategory(
    parentSelector: string,
    productSelector: string
  ): Promise<Locator[] | undefined> {
    scraperLogger.debug(
      `Wait for product category with selector '${parentSelector}' to be visible.`
    );
    try {
      this.productCategory = this.page?.locator(parentSelector);

      if (!this.productCategory) {
        scraperLogger.error(
          `Section with selector '${parentSelector}' not found.`
        );
        return;
      }

      // Fetch category name from the section header
      const categoryHandle = this.productCategory.locator("h2, h3").first();
      const categoryText = await categoryHandle.textContent();
      if (categoryText) {
        this.cachedCategoryName = categoryText
          .trim()
          .replace(/,/g, "")
          .replace(/& /g, "");
      }

      const allProducts = this.productCategory.locator(productSelector);
      const count = await allProducts.count();
      const discountProducts = [];
      for (let i = 0; i < count; i++) {
        discountProducts.push(allProducts.nth(i));
      }

      scraperLogger.info(
        `Found ${discountProducts.length} elements for discount products under the parent selector '${parentSelector}'.`
      );

      return discountProducts;
    } catch (error) {
      scraperLogger.error(
        `Error finding elements for discount products with selector '${productSelector}':`,
        error
      );
    }
  }

  public async getDiscountProductDetails(
    productElement: Locator,
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

    scraperLogger.info(
      `Product details scraped for '${productDiscountDetails.name}'.`
    );

    return productDiscountDetails;
  }

  /**
   * Extracts all product data in a single browser call for optimal performance.
   * This method should be overridden by child classes to handle supermarket-specific logic.
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
    // Default implementation - child classes should override this
    const productData = await productElement.evaluate(
      (element: Element, config: IProductDetails) => {
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
      const productCategoryHandle = this.productCategory?.locator(
        productCategorySelector[0]
      );
      let productCategoryName = "";

      if (productCategoryHandle) {
        const text = await productCategoryHandle.textContent();
        productCategoryName = text || "";
      }

      scraperLogger.debug(
        `Product category name retrieved: '${productCategoryName}'.`
      );
      return productCategoryName.trim().replace(/,/g, "").replace(/& /g, "");
    } catch (error) {
      scraperLogger.error(
        `Error retrieving product name with selector '${this.productCategory}':`,
        error
      );
      return "";
    }
  }

  protected async getProductName(
    anchorHandle: Locator,
    productNameSelector: string[]
  ): Promise<string> {
    try {
      const productName =
        (await anchorHandle
          .locator(productNameSelector[0])
          .textContent()
          .then((text) => text?.trim())) || "";
      scraperLogger.debug(`Product name retrieved: '${productName}'.`);
      return productName.trim();
    } catch (error) {
      scraperLogger.error(
        `Error retrieving product name with selector '${productNameSelector[0]}':`,
        error
      );
      return "";
    }
  }

  abstract getOriginalPrice(
    anchorHandle: Locator,
    originalPriceSelector: string[]
  ): Promise<number>;

  abstract getDiscountPrice(
    anchorHandle: Locator,
    discountPriceSelector: string[]
  ): Promise<number>;

  protected async getSpecialDiscount(
    anchorHandle: Locator,
    specialDiscountSelector: string[]
  ): Promise<string> {
    try {
      const elements = anchorHandle.locator(specialDiscountSelector[0]);
      const count = await elements.count();
      const texts: string[] = [];
      for (let i = 0; i < count; i++) {
        const text = await elements.nth(i).textContent();
        if (text) {
          texts.push(text);
        }
      }
      const specialDiscount = texts.join(" ");
      scraperLogger.debug(
        `Special discount text retrieved: '${specialDiscount}'.`
      );
      return specialDiscount.trim();
    } catch (error) {
      scraperLogger.warn(
        `Warn retrieving special discount text with selector '${specialDiscountSelector[0]}':`,
        error
      );
      return "";
    }
  }
}

export default SupermarketClient;
