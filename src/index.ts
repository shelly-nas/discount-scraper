import DateTimeHandler from "./utils/DateTimeHandler";
import JsonReader from "./utils/JsonReader";
import JsonWriter from "./utils/JsonWriter";
import NotionConverter from "./utils/NotionConverter";
import { logger } from "./utils/Logger";
import { GroceryDiscountsModel } from "./models/GroceryDiscountsModel";
import { ElementHandle } from "playwright";
import NotionDatabaseClient from "./clients/database/NotionDatabaseClient";
import {
  createGroceryClient,
  getConfig,
  getEnvVariable,
} from "./utils/ConfigHelper";
import AIClient from "./clients/ai/OpenAIClient";
import {
  createProductDb,
  createProductCategoryDb,
  updateProductDb,
} from "./data/JsonDataManager";
import ProductModel from "./models/ProductModel";
import ProductCategoryModel from "./models/ProductCategoryModel";
require("dotenv").config();

async function getGroceryDiscounts(
  config: IGroceryWebStore
): Promise<GroceryDiscountsModel> {
  const groceryClient = createGroceryClient(config.name);
  const productDiscounts: IProductDiscount[] = [];

  await groceryClient.init();      
  await groceryClient.navigate(config.url);
  await groceryClient.handleCookiePopup(config.webIdentifiers.cookieDecline);

  // Iterate over each product category defined in the grocery store's configuration
  for (const productCategory of config.webIdentifiers.productCategories) {
    // Get the products listed under the current category that are on discount
    const discountProducts: ElementHandle[] | undefined =
      await groceryClient.getDiscountProductsByProductCategory(
        productCategory,
        config.webIdentifiers.products
      );

    if (!discountProducts) {
      logger.error(
        `No discount products for product category '${productCategory}'.`
      );
      break;
    }

    // For each discount product found, get its details and append it to the groceryDiscounts
    for (const discountProduct of discountProducts) {
      const productDiscountDetails: IProductDiscount =
        await groceryClient.getDiscountProductDetails(
          discountProduct,
          config.webIdentifiers.promotionProducts
        );
      productDiscounts.push(productDiscountDetails);
    }
    logger.info(`Discount details are scraped and stored.`);
  }

  // Close the grocery client (e.g., close browser instance, clear resources)
  await groceryClient.close();

  // Use JsonWriter to write the ProductDiscount details to a JSON file
  return new GroceryDiscountsModel(config.name, productDiscounts);
}

async function setProductCategory(): Promise<void> {
  const jsonDiscountProductsReader = new JsonReader<ProductModel>(
    getEnvVariable("DB_PRODUCT")
  );
  const jsonDiscountProducts = await jsonDiscountProductsReader.read();

  const jsonProductCategoriesPathReader = new JsonReader<ProductCategoryModel>(
    getEnvVariable("DB_PRODUCT_CATEGORY")
  );
  const jsonProductCategories = await jsonProductCategoriesPathReader.read();

  const apiKey = getEnvVariable("CHATGPT_API_KEY");
  const ai = new AIClient(apiKey);

  await ai.categorizeProducts(
    JSON.stringify(jsonDiscountProducts),
    JSON.stringify(jsonProductCategories)
  );

  logger.info("Defined category for discount products.");
  
  logger.info(`Update the '${getEnvVariable("DB_PRODUCT")}' database.`);
  const productDb = JSON.parse(ai.getCompletionContent())
  await updateProductDb("category", productDb);
}

async function flushNotionDiscountDatabase(
  groceryDiscountsFilePath: string,
  groceryName: string
): Promise<void> {
  // Use the NotionDatabaseClient to set the ProductDiscount details to a Notion database
  const integrationToken = getEnvVariable("NOTION_SECRET");
  const databaseId = getEnvVariable("NOTION_DATABASE_ID");
  const groceryDiscountsSchemaFilePath = getEnvVariable(
    "GROCERY_DISCOUNTS_SCHEMA"
  );

  const jsonReader = new JsonReader<IGroceryDiscounts>(
    groceryDiscountsFilePath,
    groceryDiscountsSchemaFilePath
  );
  const jsonData = (await jsonReader.read()) as IGroceryDiscounts;

  const notion = new NotionDatabaseClient(integrationToken, databaseId);

  const propertyFilter = new NotionConverter().querySupermarket(groceryName);

  await notion.flushDatabase(jsonData, propertyFilter);
}

async function discountScraper(): Promise<void> {
  const productCategoriesReferencePath = getEnvVariable(
    "PRODUCT_CATEGORIES_REFERENCE_PATH"
  );
  const groceryConfig = await getConfig();
  const categoryReader = await new JsonReader<string[]>(
    productCategoriesReferencePath
  ).read();
  await createProductCategoryDb(categoryReader);

  const groceryDiscounts = await getGroceryDiscounts(groceryConfig);

  await createProductDb(groceryDiscounts.discounts);
  // await createDiscountDb(groceryDiscounts.discounts);

  // const jsonDiscounts = new JsonWriter(
  //   `./export/${groceryConfig.name}_${DateTimeHandler.getDateTimeShort()}.json`
  // );
  // await jsonDiscounts.write(groceryDiscounts);

  await setProductCategory();

  // if (groceryDiscounts.discounts.length > 0) {
  //   await flushNotionDiscountDatabase(
  //     jsonDiscounts.getFilePath(),
  //     groceryConfig.name
  //   );
  //   logger.info("Discounts are added to Notion database.");
  // } else {
  //   logger.error("No discounts found to add to Notion.");
  // }

  logger.info("Discount scraper process has been completed.");
}

discountScraper();
