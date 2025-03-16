import { logger } from "../../utils/Logger";
import { ElementHandle } from "playwright";
import WebClient from "./WebClient";
import DateTimeHandler from "../../utils/DateTimeHandler";

abstract class SupermarketClient extends WebClient {
  abstract name: string;
  private expireDate: string = '';
  private productCategory:
    | ElementHandle<SVGElement | HTMLElement>
    | null
    | undefined;

  public async getPromotionExpireDate(selector: string): Promise<void> {
    try {
      await this.page?.waitForLoadState("domcontentloaded", { timeout: 30000 });
      const expireStringRaw = await this.page?.textContent(selector);
      if (!expireStringRaw) {
        logger.warn(`No promotion expire date found for '${selector}'.`);
        return;
      }
      
      // Extract the substring after "t/m"
      const tmIndex = expireStringRaw.indexOf("t/m");
      let expireDateRaw = '';
      if (tmIndex === -1) {
        logger.warn(`No "t/m" found in promotion expire date: '${expireStringRaw}'`);
        expireDateRaw = expireStringRaw;
      } else {
        expireDateRaw = expireStringRaw.substring(tmIndex + 3).trim(); // +3 to skip over "t/m"
      }
      
      const [day, month] = expireDateRaw.split(' ');
      const monthMap: { [key: string]: number } = {
        'jan': 0, 'januari': 0, 'feb': 1, 'februari': 1, 'mrt': 2, 'maart': 2, 'apr': 3, 'april': 3, 
        'mei': 4, 'jun': 5, 'juni': 5, 'jul': 6, 'juli': 6, 'aug': 7, 'augustus': 7, 'sep': 8, 
        'september': 8, 'okt': 9, 'oktober': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
      };
      const expireDate = new Date();
      expireDate.setMonth(monthMap[month.toLowerCase()]);
      expireDate.setDate(parseInt(day));
      this.expireDate = expireDate.toISOString();

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
    logger.debug(`Wait for product category with ID '${parentSelector}' to be visible.`);
    await this.page?.waitForLoadState("domcontentloaded", { timeout: 30000 });
    let discountProducts;

    try {
      this.productCategory = await this.page?.$(parentSelector);

      if (!this.productCategory) {
        logger.error(`Section with ID '${parentSelector}' not found.`);
        return;
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

  public async getDiscountProductDetails(productSelector: ElementHandle, productConfig: IProductDetails): Promise<IProductDiscountDetails> {
    const productDiscountDetails = {
      name: await this.getProductName(
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
      category: await this.getProductCategoryName(
        productConfig.productCategory
      ),
      supermarket: this.name,
      expireDate: this.expireDate,
    };
    logger.info(
      `Product details a scraped for '${productDiscountDetails.name}'.`
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
      return productCategoryName.trim().replace(/,/g, '').replace(/& /g, '');
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
