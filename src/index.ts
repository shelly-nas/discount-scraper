import JsonReader from "./utils/JsonReader";
import NotionManager from "./utils/NotionManager";
import { logger } from "./utils/Logger";
import { ElementHandle } from "playwright";
import NotionDatabaseClient from "./clients/database/NotionDatabaseClient";
import {
  createGroceryClient,
  getConfig,
  getEnvVariable,
} from "./utils/ConfigHelper";
import AIClient from "./clients/ai/OpenAIClient";
import JsonDataManager from "./data/JsonDataManager";
require("dotenv").config();

const jsonDataManager = new JsonDataManager();

async function getGroceryDiscounts(
  config: IGroceryWebStore
): Promise<IProductDiscount[]> {
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
  return productDiscounts;
}

async function setProductCategory(): Promise<void> {
  const jsonProducts = jsonDataManager.getProductController().getProducts();
  const jsonProductCategories = jsonDataManager.getProductCategoryController().getCategories();

  const apiKey = getEnvVariable("CHATGPT_API_KEY");
  const ai = new AIClient(apiKey);

  await ai.categorizeProducts(
    JSON.stringify(jsonProducts),
    JSON.stringify(jsonProductCategories)
  );

  logger.info("Defined category for discount products.");

  logger.info(`Update the '${getEnvVariable("DB_PRODUCT")}' database.`);
  const productDb = JSON.parse(ai.getCompletionContent());
  await jsonDataManager.updateProductDb("category", productDb);
}

async function flushNotionDiscountDatabaseByGrocery(
  groceryName: string
): Promise<void> {
  // Use the NotionDatabaseClient to set the ProductDiscount details to a Notion database
  const integrationToken = getEnvVariable("NOTION_SECRET");
  const databaseId = getEnvVariable("NOTION_DATABASE_ID");
  const notion = new NotionDatabaseClient(integrationToken, databaseId);
  const propertyFilter = new NotionManager().querySupermarket(groceryName);

  // Construct a IGroceryDiscounts object from the JsonDataContext
  const discounts: IGroceryDiscount[] =
    await jsonDataManager.getGroceryDiscountsVerbose();

  // Convert product discounts to database entries
  const discountEntries = new NotionManager().toDatabaseEntries(discounts);
  logger.info(
    `Converted product discounts to ${discountEntries.length} new database entries.`
  );

  if (discountEntries.length > 0) {
    await notion.flushDatabase(discountEntries, propertyFilter);
    logger.info("Discounts are added to Notion database.");
  } else {
    logger.error("No discounts found to add to Notion.");
  }
}

async function discountScraper(): Promise<void> {
  logger.info("Discount scraper process has started!");
  const productCategoriesReferencePath = getEnvVariable(
    "PRODUCT_CATEGORIES_REFERENCE_PATH"
  );
  const groceryConfig = await getConfig();
  const jsonReader = await new JsonReader<string[]>(
    productCategoriesReferencePath
  ).read();

  await jsonDataManager.addProductCategoryDb(jsonReader);

  const groceryDiscounts = await getGroceryDiscounts(groceryConfig);

  await jsonDataManager.addProductDb(groceryConfig.name, groceryDiscounts);
  await jsonDataManager.addDiscountDb(groceryDiscounts);

  await setProductCategory();

  await flushNotionDiscountDatabaseByGrocery(groceryConfig.name);

  logger.info("Discount scraper process has stopped!");
}

discountScraper();
