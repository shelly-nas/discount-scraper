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
  const productDb = JSON.parse("[{\"id\":1,\"name\":\"AH Groenteshots\",\"category\":1},{\"id\":2,\"name\":\"AH 80% Groentesap 250 ml\",\"category\":1},{\"id\":3,\"name\":\"AH Gekruide bakaardappeltjes\",\"category\":1},{\"id\":4,\"name\":\"AH Fruitsalades\",\"category\":1},{\"id\":5,\"name\":\"Alle AH Vegetarische verspakketten\",\"category\":1},{\"id\":6,\"name\":\"Alle AH Kleinverpakkingen groentegemak\",\"category\":1},{\"id\":7,\"name\":\"AH Biologische portobello 2 stuks\",\"category\":1},{\"id\":8,\"name\":\"AH Broccoli\",\"category\":1},{\"id\":9,\"name\":\"AH Sweet palermo rode puntpaprika 2 stuks\",\"category\":1},{\"id\":10,\"name\":\"AH Prei\",\"category\":1},{\"id\":11,\"name\":\"AH Red Intense Nederlandse trostomaten 450 gram\",\"category\":1},{\"id\":12,\"name\":\"AH Frambozen 225 gram\",\"category\":1},{\"id\":13,\"name\":\"AH Blauwe bessen 300 of 500 gram\",\"category\":1},{\"id\":14,\"name\":\"AH Nederlandse aardbeien 400 gram\",\"category\":1},{\"id\":15,\"name\":\"Alle Pink lady appels\",\"category\":1},{\"id\":16,\"name\":\"AH Vers uit eigen keuken\",\"category\":8},{\"id\":17,\"name\":\"Alle AH Kleine salades\",\"category\":8},{\"id\":18,\"name\":\"Alle AH Bapao 115 gram\",\"category\":8},{\"id\":19,\"name\":\"Alle AH Stoommaaltijden of -soepen\",\"category\":8},{\"id\":20,\"name\":\"Bifi\",\"category\":2},{\"id\":21,\"name\":\"AH Spareribs zoet heel\",\"category\":2},{\"id\":22,\"name\":\"Alle AH Scharrelkipburgers 2 stuks\",\"category\":2},{\"id\":23,\"name\":\"AH Varkensshoarma of -gyros 250-500 gram\",\"category\":2},{\"id\":24,\"name\":\"AH Pangasiusfilet naturel 1 en 2 stuks\",\"category\":2},{\"id\":25,\"name\":\"Alle AH Runder-chipolataworstjes\",\"category\":2},{\"id\":26,\"name\":\"Alle AH Terra plantaardige worsten\",\"category\":2},{\"id\":27,\"name\":\"AH Terra tussendoortje plantaardig alternatief voor yoghurt mango\",\"category\":4},{\"id\":28,\"name\":\"AH Terra plantaardig alternatief voor crème fraîche\",\"category\":4},{\"id\":29,\"name\":\"AH Terra plantaardig alternatief voor yoghurt Griekse stijl\",\"category\":4},{\"id\":30,\"name\":\"AH Terra plantaardig alternatief voor yoghurt\",\"category\":4},{\"id\":31,\"name\":\"AH Terra tussendoortje plantaardig alternatief voor yoghurt zwarte bes\",\"category\":4},{\"id\":32,\"name\":\"AH Terra plantaardig alternatief voor kwark\",\"category\":4},{\"id\":33,\"name\":\"Alle Vivera*\",\"category\":2},{\"id\":34,\"name\":\"Scrocchi, Picos en Borreltoast\",\"category\":3},{\"id\":35,\"name\":\"AH Goudse 48+ jong belegen kaas in stukken grootverpakking van de zelf-bedieningsafdeling\",\"category\":3},{\"id\":36,\"name\":\"Alle AH Gegrilde beenham van de versafdeling\",\"category\":3},{\"id\":37,\"name\":\"Alle Heks'nkaas 150-200 gram\",\"category\":3},{\"id\":38,\"name\":\"Alle Zaanlander plakken\",\"category\":3},{\"id\":39,\"name\":\"Alle Dodoni\",\"category\":3},{\"id\":40,\"name\":\"AH Biologisch kazen voor koken snacken\",\"category\":3},{\"id\":41,\"name\":\"BBQ sausjes\",\"category\":10},{\"id\":42,\"name\":\"Arla Biologisch, Arla Skyr en Lurpak: gratis bezorging bij 12 euro\",\"category\":4},{\"id\":43,\"name\":\"Optimel, Valess en Vifit: gratis bezorging bij 10 euro\",\"category\":4},{\"id\":44,\"name\":\"Alle Melkunie Breaker\",\"category\":4},{\"id\":45,\"name\":\"Alle Becel\",\"category\":4},{\"id\":46,\"name\":\"Alle Almhof yoghurt 500 gram\",\"category\":4},{\"id\":47,\"name\":\"Alle AH Donuts\",\"category\":5},{\"id\":48,\"name\":\"AH Rondjefrikandel speciaal\",\"category\":8},{\"id\":49,\"name\":\"Alle AH Desempistolets\",\"category\":5},{\"id\":50,\"name\":\"Alle AH Stevig brood heel\",\"category\":5},{\"id\":51,\"name\":\"AH Oranje tompoucen 4 stuks of soesjes 11 stuks\",\"category\":5},{\"id\":52,\"name\":\"Quaker: gratis bezorging bij 10 euro\",\"category\":6},{\"id\":53,\"name\":\"Peijnenburg en Snelle Jelle: 2 euro korting op bezorging bij 2 stuks\",\"category\":6},{\"id\":54,\"name\":\"Lotus Biscoff speculoospasta 200 gram\",\"category\":6},{\"id\":55,\"name\":\"AH Multimix\",\"category\":11},{\"id\":56,\"name\":\"AH Luxe noten\",\"category\":11},{\"id\":57,\"name\":\"AH Markthal noten\",\"category\":11},{\"id\":58,\"name\":\"AH Walnoten ongezouten 110 en AH Walnoten ongebrand 300 gram\",\"category\":11},{\"id\":59,\"name\":\"Alle Lay's Bugles 125 gram en Sensations\",\"category\":11},{\"id\":60,\"name\":\"Snickers Ijs, M&M's en Twix Mini's: gratis bezorging bij 12 euro\",\"category\":12},{\"id\":61,\"name\":\"Alle M&M's 135-200 gram\",\"category\":11},{\"id\":62,\"name\":\"Fruitfunk\",\"category\":11},{\"id\":63,\"name\":\"Alle Balconi Cake\",\"category\":11},{\"id\":64,\"name\":\"Alle Lindt\",\"category\":11},{\"id\":65,\"name\":\"Alle Klene, Look-O-Look en Chupa Chups tot 270 gram\",\"category\":11},{\"id\":66,\"name\":\"Online only: Killerbody Protein bars chocolade\",\"category\":11},{\"id\":67,\"name\":\"Alle Douwe Egberts snelfiltermaling 250 gram\",\"category\":6},{\"id\":68,\"name\":\"Alle Douwe Egberts Nespresso capsules 20 stuks\",\"category\":6},{\"id\":69,\"name\":\"Celestial & Twinings\",\"category\":7},{\"id\":70,\"name\":\"Alle Perla nespresso\",\"category\":6},{\"id\":71,\"name\":\"Alle Pepsi, Rivella en 7UP 1.5 literflessen\",\"category\":7},{\"id\":72,\"name\":\"Lipton ice tea 6-pack\",\"category\":7},{\"id\":73,\"name\":\"Alle Lipton ice tea 1.5 liter\",\"category\":7},{\"id\":74,\"name\":\"Aquarius & Powerade 12-pack\",\"category\":7},{\"id\":75,\"name\":\"Alle Appelsientje FruitDrink\",\"category\":7},{\"id\":76,\"name\":\"Alle Royal Club literflessen\",\"category\":7},{\"id\":77,\"name\":\"La Tulipe chardonnay doos\",\"category\":7},{\"id\":78,\"name\":\"Li Limoncellow\",\"category\":7},{\"id\":79,\"name\":\"Lindeman's dozen\",\"category\":7},{\"id\":80,\"name\":\"Alle Lindeman's South Africa 0.75 liter\",\"category\":7},{\"id\":81,\"name\":\"Beblenheim pinot blanc doos\",\"category\":7},{\"id\":82,\"name\":\"Slurp! chardonnay doos\",\"category\":7},{\"id\":83,\"name\":\"Peachtree\",\"category\":7},{\"id\":84,\"name\":\"Alle Franse witte wijnen 0.75 liter\",\"category\":7},{\"id\":85,\"name\":\"Amstel, Birra Moretti, Texels, Apple Bandit en Affligem: gratis bezorging bij 2 stuks\",\"category\":7},{\"id\":86,\"name\":\"Alle Leffe of Chouffe multipacks\",\"category\":7},{\"id\":87,\"name\":\"Desperados & Corona multipacks\",\"category\":7},{\"id\":88,\"name\":\"Alle Hertog Jan, Bud of Jupiler multipacks of kratten\",\"category\":7},{\"id\":89,\"name\":\"Alle Heineken or Grolsch 6-packs\",\"category\":7},{\"id\":90,\"name\":\"Heineken tray 24 x 33 cl\",\"category\":7},{\"id\":91,\"name\":\"Alle Lassie rijst 275-450 gram\",\"category\":9},{\"id\":92,\"name\":\"Alle Hak stazakken en pakken\",\"category\":9},{\"id\":93,\"name\":\"Royal en Costa Ligure\",\"category\":10},{\"id\":94,\"name\":\"Alle Unox Cup-a-Soup en Good snacks\",\"category\":10},{\"id\":95,\"name\":\"AH Vegan pesto rosso\",\"category\":10},{\"id\":96,\"name\":\"Bertolli olie en azijn* en Carapelli\",\"category\":10},{\"id\":97,\"name\":\"Dr Oetker: gratis bezorging bij 4 stuks\",\"category\":12},{\"id\":98,\"name\":\"Alle Mora Originals\",\"category\":12},{\"id\":99,\"name\":\"Alle Ola handijs\",\"category\":12},{\"id\":100,\"name\":\"Elmex: gratis bezorging bij 3 stuks\",\"category\":13},{\"id\":101,\"name\":\"Alle Biodermal\",\"category\":13},{\"id\":102,\"name\":\"Alle Sensodyne en Parodontax\",\"category\":13},{\"id\":103,\"name\":\"Alle Head & Shoulders*\",\"category\":13},{\"id\":104,\"name\":\"Alle Seepje\",\"category\":14},{\"id\":105,\"name\":\"Alle Lucovitaal\",\"category\":13},{\"id\":106,\"name\":\"Alle L'Oréal en Garnier\",\"category\":13},{\"id\":107,\"category\":15}]")
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
