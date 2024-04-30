import AhClient from "../clients/web/AhClient";
import DirkClient from "../clients/web/DirkClient";
import PlusClient from "../clients/web/PlusClient";
import SupermarketClient from "../clients/web/SupermarketClient";
import ArgumentHandler from "./ArgumentHandler";
import JsonReader from "./JsonReader";
import { logger } from "./Logger";

export function getEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    logger.error(`The ${name} environment variable is not set.`);
    process.exit(1);
  }
  return value;
}

export async function getConfig(): Promise<ISupermarketWebIdentifiers> {
    const groceryWebStoreSchemaFilePath = getEnvVariable("GROCERY_SCHEMA");
    const argHandler = new ArgumentHandler(process.argv);
    const configPath = argHandler.getArgByFlag("--config");
  
    const jsonReader = new JsonReader(configPath, groceryWebStoreSchemaFilePath);
    const jsonData = (await jsonReader.read()) as ISupermarketWebIdentifiers;
  
    logger.debug("JSON data read from file:", jsonData);
    return jsonData;
  }

export function getSupermarketClient(name: string): SupermarketClient {
  switch (name) {
    case "Albert Heijn":
      return new AhClient();
    case "Dirk":
      return new DirkClient();
    case "PLUS":
      return new PlusClient();
    default:
      logger.error("Descendent of Grocery Client could not be found or instantiated.");
      process.exit(1);
  }
}