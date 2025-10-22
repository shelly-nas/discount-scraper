import * as dotenv from "dotenv";
import { logger } from "../utils/Logger";
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
    max: parseInt(process.env.DB_POOL_MAX || "20", 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || "2000",
      10
    ),
  };

  if (!config.password) {
    logger.warn("Database password not set in environment variables");
  }

  logger.debug("Database configuration loaded", {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
  });

  return config;
}
