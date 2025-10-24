import PostgresDataContext from "../data/PostgresDataContext";
import ScraperRunModel from "../models/ScraperRunModel";
import { scraperLogger } from "../utils/Logger";

interface ScraperRunRow {
  id: number;
  supermarket: string;
  status: "running" | "success" | "failed";
  products_scraped: number;
  products_updated: number;
  products_created: number;
  discounts_deactivated: number;
  discounts_created: number;
  error_message: string | null;
  started_at: Date;
  completed_at: Date | null;
  duration_seconds: number | null;
  promotion_expire_date: Date | null;
}

class PostgresScraperRunController {
  private db: PostgresDataContext;

  constructor(db: PostgresDataContext) {
    this.db = db;
    scraperLogger.debug("PostgresScraperRunController initialized.");
  }

  async exists(): Promise<boolean> {
    scraperLogger.debug("Checking if the scraper_runs table exists.");
    try {
      const result = await this.db.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'scraper_runs'
        )`
      );
      return result.rows[0].exists;
    } catch (error) {
      scraperLogger.error("Error checking if scraper_runs table exists", error);
      return false;
    }
  }

  async createRun(supermarket: string): Promise<number> {
    scraperLogger.debug(`Creating new scraper run for: ${supermarket}`);
    try {
      const result = await this.db.query<{ id: number }>(
        `INSERT INTO scraper_runs (supermarket, status, started_at) 
         VALUES ($1, 'running', NOW()) 
         RETURNING id`,
        [supermarket]
      );

      const runId = result.rows[0].id;
      scraperLogger.info(`Scraper run created with ID: ${runId}`);
      return runId;
    } catch (error) {
      scraperLogger.error(
        `Error creating scraper run for ${supermarket}`,
        error
      );
      throw error;
    }
  }

  async updateRunSuccess(
    runId: number,
    metrics: {
      productsScraped: number;
      productsUpdated: number;
      productsCreated: number;
      discountsDeactivated: number;
      discountsCreated: number;
      promotionExpireDate?: Date;
    }
  ): Promise<void> {
    scraperLogger.debug(`Updating scraper run ${runId} to success`);
    try {
      await this.db.query(
        `UPDATE scraper_runs 
         SET status = 'success',
             products_scraped = $2,
             products_updated = $3,
             products_created = $4,
             discounts_deactivated = $5,
             discounts_created = $6,
             promotion_expire_date = $7,
             completed_at = NOW(),
             duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
         WHERE id = $1`,
        [
          runId,
          metrics.productsScraped,
          metrics.productsUpdated,
          metrics.productsCreated,
          metrics.discountsDeactivated,
          metrics.discountsCreated,
          metrics.promotionExpireDate || null,
        ]
      );
      scraperLogger.info(`Scraper run ${runId} marked as success`);
    } catch (error) {
      scraperLogger.error(
        `Error updating scraper run ${runId} to success`,
        error
      );
      throw error;
    }
  }

  async updateRunFailure(runId: number, errorMessage: string): Promise<void> {
    scraperLogger.debug(`Updating scraper run ${runId} to failed`);
    try {
      await this.db.query(
        `UPDATE scraper_runs 
         SET status = 'failed',
             error_message = $2,
             completed_at = NOW(),
             duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
         WHERE id = $1`,
        [runId, errorMessage]
      );
      scraperLogger.info(`Scraper run ${runId} marked as failed`);
    } catch (error) {
      scraperLogger.error(
        `Error updating scraper run ${runId} to failed`,
        error
      );
      throw error;
    }
  }

  async getRunById(runId: number): Promise<ScraperRunModel | null> {
    scraperLogger.debug(`Fetching scraper run with ID: ${runId}`);
    try {
      const result = await this.db.query<ScraperRunRow>(
        `SELECT id, supermarket, status, products_scraped, products_updated, 
                products_created, discounts_deactivated, discounts_created,
                error_message, started_at, completed_at, duration_seconds, promotion_expire_date
         FROM scraper_runs 
         WHERE id = $1`,
        [runId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new ScraperRunModel(
        row.id,
        row.supermarket,
        row.status,
        row.products_scraped,
        row.products_updated,
        row.products_created,
        row.discounts_deactivated,
        row.discounts_created,
        row.error_message || undefined,
        row.started_at,
        row.completed_at || undefined,
        row.duration_seconds || undefined,
        row.promotion_expire_date || undefined
      );
    } catch (error) {
      scraperLogger.error(`Error fetching scraper run ${runId}`, error);
      throw error;
    }
  }

  async getAllRuns(limit: number = 100): Promise<ScraperRunModel[]> {
    scraperLogger.debug(`Fetching last ${limit} scraper runs`);
    try {
      const result = await this.db.query<ScraperRunRow>(
        `SELECT id, supermarket, status, products_scraped, products_updated, 
                products_created, discounts_deactivated, discounts_created,
                error_message, started_at, completed_at, duration_seconds, promotion_expire_date
         FROM scraper_runs 
         ORDER BY started_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(
        (row) =>
          new ScraperRunModel(
            row.id,
            row.supermarket,
            row.status,
            row.products_scraped,
            row.products_updated,
            row.products_created,
            row.discounts_deactivated,
            row.discounts_created,
            row.error_message || undefined,
            row.started_at,
            row.completed_at || undefined,
            row.duration_seconds || undefined,
            row.promotion_expire_date || undefined
          )
      );
    } catch (error) {
      scraperLogger.error("Error fetching scraper runs", error);
      throw error;
    }
  }

  async getRunsBySupermarket(
    supermarket: string,
    limit: number = 50
  ): Promise<ScraperRunModel[]> {
    scraperLogger.debug(
      `Fetching last ${limit} scraper runs for ${supermarket}`
    );
    try {
      const result = await this.db.query<ScraperRunRow>(
        `SELECT id, supermarket, status, products_scraped, products_updated, 
                products_created, discounts_deactivated, discounts_created,
                error_message, started_at, completed_at, duration_seconds, promotion_expire_date
         FROM scraper_runs 
         WHERE supermarket = $1
         ORDER BY started_at DESC
         LIMIT $2`,
        [supermarket, limit]
      );

      return result.rows.map(
        (row) =>
          new ScraperRunModel(
            row.id,
            row.supermarket,
            row.status,
            row.products_scraped,
            row.products_updated,
            row.products_created,
            row.discounts_deactivated,
            row.discounts_created,
            row.error_message || undefined,
            row.started_at,
            row.completed_at || undefined,
            row.duration_seconds || undefined,
            row.promotion_expire_date || undefined
          )
      );
    } catch (error) {
      scraperLogger.error(
        `Error fetching scraper runs for ${supermarket}`,
        error
      );
      throw error;
    }
  }

  async getLastRunBySupermarket(
    supermarket: string
  ): Promise<ScraperRunModel | null> {
    scraperLogger.debug(`Fetching last scraper run for ${supermarket}`);
    try {
      const result = await this.db.query<ScraperRunRow>(
        `SELECT id, supermarket, status, products_scraped, products_updated, 
                products_created, discounts_deactivated, discounts_created,
                error_message, started_at, completed_at, duration_seconds, promotion_expire_date
         FROM scraper_runs 
         WHERE supermarket = $1
         ORDER BY started_at DESC
         LIMIT 1`,
        [supermarket]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new ScraperRunModel(
        row.id,
        row.supermarket,
        row.status,
        row.products_scraped,
        row.products_updated,
        row.products_created,
        row.discounts_deactivated,
        row.discounts_created,
        row.error_message || undefined,
        row.started_at,
        row.completed_at || undefined,
        row.duration_seconds || undefined,
        row.promotion_expire_date || undefined
      );
    } catch (error) {
      scraperLogger.error(
        `Error fetching last scraper run for ${supermarket}`,
        error
      );
      throw error;
    }
  }

  async getRunStats(): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    successRate: number;
  }> {
    scraperLogger.debug("Fetching scraper run statistics");
    try {
      const result = await this.db.query<{
        total_runs: string;
        successful_runs: string;
        failed_runs: string;
      }>(
        `SELECT 
          COUNT(*) as total_runs,
          COUNT(*) FILTER (WHERE status = 'success') as successful_runs,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_runs
         FROM scraper_runs`
      );

      const row = result.rows[0];
      const totalRuns = parseInt(row.total_runs, 10);
      const successfulRuns = parseInt(row.successful_runs, 10);
      const failedRuns = parseInt(row.failed_runs, 10);
      const successRate =
        totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      return {
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      scraperLogger.error("Error fetching scraper run statistics", error);
      throw error;
    }
  }
}

export default PostgresScraperRunController;
