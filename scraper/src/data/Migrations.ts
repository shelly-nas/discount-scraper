import fs from "fs/promises";
import path from "path";
import PostgresDataContext from "./PostgresDataContext";
import { serverLogger } from "../utils/Logger";

// Migrations are plain .sql files shipped next to dist/. They run in filename
// order on every start; schema_migrations records which ones already ran, so a
// restart is a no-op and an existing database only gets what it is missing.
// database/src/schema.sql still creates the base schema on a fresh volume (the
// postgres entrypoint only runs it once); every later change belongs here.
const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "migrations");
const MIGRATION_FILE = /^\d{3}_.*\.sql$/;

export async function runMigrations(db: PostgresDataContext): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    let files: string[];
    try {
      files = (await fs.readdir(MIGRATIONS_DIR))
        .filter((f) => MIGRATION_FILE.test(f))
        .sort();
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        serverLogger.warn(`No migrations directory at ${MIGRATIONS_DIR}`);
        return;
      }
      throw error;
    }

    const applied = await client.query("SELECT filename FROM schema_migrations");
    const appliedSet = new Set<string>(applied.rows.map((r: any) => r.filename));
    const pending = files.filter((f) => !appliedSet.has(f));

    for (const filename of pending) {
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, filename), "utf8");
      // One transaction per file: a failure leaves it unrecorded, so the next
      // start retries it instead of skipping a half-applied change.
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
          filename,
        ]);
        await client.query("COMMIT");
        serverLogger.info(`Applied migration ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${filename} failed: ${error}`);
      }
    }

    serverLogger.info(
      pending.length === 0
        ? `Database schema up to date (${files.length} migrations)`
        : `Applied ${pending.length} migration(s)`
    );
  } finally {
    client.release();
  }
}
