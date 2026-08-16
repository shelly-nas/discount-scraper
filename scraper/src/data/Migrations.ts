import PostgresDataContext from "./PostgresDataContext";
import { scraperLogger } from "../utils/Logger";

interface Migration {
  name: string;
  sql: string;
}

/**
 * Idempotent schema migrations applied on every API startup.
 *
 * The database image ships schema.sql via docker-entrypoint-initdb.d, but those
 * scripts only run when the Postgres data directory is empty. Existing
 * deployments therefore never receive columns added after their volume was
 * created, so migrations are applied here instead.
 *
 * Every statement must be safe to run repeatedly against an already-migrated
 * database. Add new migrations to the end of this list; never edit or remove an
 * existing entry.
 */
const migrations: Migration[] = [
  {
    name: "products.product_url",
    sql: "ALTER TABLE products ADD COLUMN IF NOT EXISTS product_url TEXT",
  },
  {
    name: "discounts.unit_price",
    sql: "ALTER TABLE discounts ADD COLUMN IF NOT EXISTS unit_price VARCHAR(50)",
  },
];

export async function runMigrations(): Promise<void> {
  const context = PostgresDataContext.getInstance();

  for (const migration of migrations) {
    try {
      await context.query(migration.sql);
      scraperLogger.debug(`Migration applied: ${migration.name}`);
    } catch (error) {
      scraperLogger.error(`Migration failed: ${migration.name}`, error);
      throw error;
    }
  }

  scraperLogger.info(`Schema migrations complete (${migrations.length} checked)`);
}

export default runMigrations;
