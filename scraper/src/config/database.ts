import * as dotenv from "dotenv";
import { scraperLogger } from "../utils/Logger";
import * as path from "path";

// Load .env from project root (two levels up from this file)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME || "discount",
    user: process.env.DB_USER || "discount_user",
    password: process.env.DB_PASSWORD || "",
    max: parseInt("20"),
    idleTimeoutMillis: parseInt("30000"),
    connectionTimeoutMillis: parseInt("2000"),
  };

  if (!config.password) {
    scraperLogger.warn("Database password not set in environment variables");
  }

  scraperLogger.debug("Database configuration loaded", {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
  });

  return config;
}
