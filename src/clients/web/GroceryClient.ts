import { logger } from "../../utils/Logger";
import { ElementHandle } from "playwright";
import WebClient from "./WebClient";

abstract class GroceryClient extends WebClient {
  private productCategory:
    | ElementHandle<SVGElement | HTMLElement>
    | null
    | undefined;

  public async getDiscountProductsByProductCategory(
    parentSelector: string,
    productSelector: string
  ): Promise<ElementHandle[] | undefined> {
    logger.debug(
      `Wait for product category with ID '${parentSelector}' to be visible.`
    );
    await this.page?.waitForSelector(parentSelector, {
      state: "visible",
      timeout: 3000,
    });
    this.productCategory = await this.page?.$(parentSelector);

    if (!this.productCategory) {
      logger.error(`Section with ID '${parentSelector}' not found.`);
      return;
    }

    let discountProducts;
    try {
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

  public async getDiscountProductDetails(
    productSelector: ElementHandle,
    productConfig: IProductDetails
  ): Promise<IProductDiscount> {
    const productDiscountDetails = {
      productCategory: await this.getProductCategoryName(
        productConfig.productCategory
      ),
      productName: await this.getProductName(
        productSelector,
        productConfig.productName
      ),
      originalPrice: await this.getOriginalPrice(
        productSelector,
        productConfig.originalPrice
      ),
      discountPrice: await this.getDiscountPrice(
        productSelector,
        productConfig.discountPrice
      ),
      specialDiscount: await this.getSpecialDiscount(
        productSelector,
        productConfig.specialDiscount
      ),
    };
    logger.info(
      `Product details a scraped for '${productDiscountDetails.productName}'.`
    );

    return productDiscountDetails;
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
      return productCategoryName.trim();
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

export default GroceryClient;
