import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { logger } from "../utils/Logger";

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

class PostgresDataContext {
  private static instance: PostgresDataContext;
  private pool: Pool;

  private constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    });

    this.pool.on("error", (err: Error) => {
      logger.error("Unexpected error on idle PostgreSQL client", err);
    });

    logger.info("PostgreSQL connection pool initialized");
  }

  public static getInstance(config?: DatabaseConfig): PostgresDataContext {
    if (!PostgresDataContext.instance) {
      if (!config) {
        throw new Error(
          "Database configuration required for first initialization"
        );
      }
      PostgresDataContext.instance = new PostgresDataContext(config);
    }
    return PostgresDataContext.instance;
  }

  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug(`Executed query in ${duration}ms: ${text}`);
      return result;
    } catch (error) {
      logger.error(`Database query error: ${text}`, error);
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      logger.error("Failed to get database client from pool", error);
      throw error;
    }
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Transaction failed, rolled back", error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query("SELECT NOW()");
      logger.info("Database connection test successful");
      return true;
    } catch (error) {
      logger.error("Database connection test failed", error);
      return false;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info("PostgreSQL connection pool closed");
    } catch (error) {
      logger.error("Error closing PostgreSQL connection pool", error);
      throw error;
    }
  }
}

export default PostgresDataContext;
