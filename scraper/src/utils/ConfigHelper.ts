import AhClient from "../clients/AhClient";
import DirkClient from "../clients/DirkClient";
import PlusClient from "../clients/PlusClient";
import SupermarketClient from "../clients/SupermarketClient";
import ArgumentHandler from "./ArgumentHandler";
import { logger } from "./Logger";
import * as dotenv from "dotenv";
import * as path from "path";
import { Pool } from "pg";
import { getDatabaseConfig } from "../config/database";

// Load .env from project root (two levels up from this file)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export function getEnvVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    logger.error(`The ${name} environment variable is not set.`);
    process.exit(1);
  }
  return value;
}

export async function getConfig(): Promise<ISupermarketWebConfig> {
  const argHandler = new ArgumentHandler(process.argv);
  const configPath = argHandler.getArgByFlag("--config");

  // Extract supermarket name from the config path (e.g., "dirk" from "../config/supermarkets/dirk.json")
  const fileName = path.basename(configPath, ".json");

  // Map short names to full names
  const nameMap: { [key: string]: string } = {
    ah: "Albert Heijn",
    dirk: "Dirk",
    plus: "PLUS",
  };

  const supermarketName = nameMap[fileName.toLowerCase()];

  if (!supermarketName) {
    logger.error(`Unknown supermarket config: ${fileName}`);
    process.exit(1);
  }

  logger.info(`Loading config for "${supermarketName}" from database...`);

  // Fetch config from database
  const dbConfig = getDatabaseConfig();
  const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  try {
    const query = `
      SELECT name, name_short, url, web_identifiers
      FROM supermarket_configs
      WHERE name = $1
    `;

    const result = await pool.query(query, [supermarketName]);

    if (result.rows.length === 0) {
      logger.error(`No config found for supermarket: ${supermarketName}`);
      process.exit(1);
    }

    const row = result.rows[0];
    const jsonData: ISupermarketWebConfig = {
      name: row.name,
      nameShort: row.name_short,
      url: row.url,
      webIdentifiers: row.web_identifiers,
    };

    logger.info(`✓ Config loaded from database for "${supermarketName}"`);
    logger.debug("Config data:", jsonData);

    return jsonData;
  } catch (error) {
    logger.error(`Error loading config from database: ${error}`);
    throw error;
  } finally {
    await pool.end();
  }
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
      logger.error(
        "Descendent of Supermarket Client could not be found or instantiated."
      );
      process.exit(1);
  }
}
