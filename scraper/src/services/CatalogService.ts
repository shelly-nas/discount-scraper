import PostgresDataContext from "../data/PostgresDataContext";
import PostgresCatalogController from "../controllers/PostgresCatalogController";
import CatalogClient from "../clients/catalog/CatalogClient";
import { getCatalogClient, CATALOG_SUPERMARKETS } from "../utils/ConfigHelper";
import { scraperLogger, serverLogger } from "../utils/Logger";

export class CatalogRunInProgressError extends Error {}

/**
 * Runs full catalog scrapes. A run takes minutes, so it is started in the
 * background and tracked in catalog_runs; one run per supermarket at a time.
 */
class CatalogService {
  private controller: PostgresCatalogController;
  private running = new Set<string>();

  constructor(
    db: PostgresDataContext,
    private clientFactory: (supermarket: string) => CatalogClient | null = getCatalogClient
  ) {
    this.controller = new PostgresCatalogController(db);
  }

  get supportedSupermarkets(): string[] {
    return CATALOG_SUPERMARKETS;
  }

  isRunning(supermarket: string): boolean {
    return this.running.has(supermarket);
  }

  getController(): PostgresCatalogController {
    return this.controller;
  }

  /**
   * Starts a run and resolves with its id as soon as it is recorded; the
   * returned `done` promise settles when the scrape finishes.
   */
  async start(supermarket: string): Promise<{ runId: number; done: Promise<void> }> {
    const client = this.clientFactory(supermarket);
    if (!client) throw new Error(`No catalog scraper for ${supermarket}`);
    if (this.running.has(supermarket)) {
      throw new CatalogRunInProgressError(`A catalog run for ${supermarket} is already running`);
    }

    this.running.add(supermarket);
    let run: { id: number; startedAt: Date };
    try {
      run = await this.controller.createRun(supermarket);
    } catch (error) {
      this.running.delete(supermarket);
      throw error;
    }

    const done = this.execute(supermarket, client, run).finally(() =>
      this.running.delete(supermarket)
    );
    return { runId: run.id, done };
  }

  private async execute(
    supermarket: string,
    client: CatalogClient,
    run: { id: number; startedAt: Date }
  ): Promise<void> {
    const totals = { seen: 0, created: 0, updated: 0, pricesChanged: 0, removed: 0 };
    scraperLogger.info(`=== Catalog run ${run.id} started for ${supermarket} ===`);

    try {
      await client.fetchCatalog(async (products) => {
        const metrics = await this.controller.upsertBatch(supermarket, products, run.startedAt);
        totals.seen += metrics.created + metrics.updated;
        totals.created += metrics.created;
        totals.updated += metrics.updated;
        totals.pricesChanged += metrics.pricesChanged;
      });

      if (totals.seen === 0) throw new Error("The catalog returned no products");

      totals.removed = await this.controller.markRemoved(supermarket, run.startedAt, totals.seen);
      await this.controller.completeRun(run.id, totals);
      serverLogger.info(
        `Catalog run ${run.id} for ${supermarket} done: ${totals.seen} products, ` +
          `${totals.created} new, ${totals.pricesChanged} price changes, ${totals.removed} removed`
      );
    } catch (error: any) {
      const message = error?.message || "Unknown error";
      serverLogger.error(`Catalog run ${run.id} for ${supermarket} failed: ${message}`);
      await this.controller.failRun(run.id, message, totals.seen).catch((e) =>
        serverLogger.error("Failed to record catalog run failure", e)
      );
    }
  }

  /** Runs every supported supermarket one after another (used by the scheduler). */
  async runAll(): Promise<void> {
    for (const supermarket of CATALOG_SUPERMARKETS) {
      if (this.running.has(supermarket)) continue;
      try {
        const { done } = await this.start(supermarket);
        await done;
      } catch (error: any) {
        serverLogger.error(`Could not start catalog run for ${supermarket}: ${error?.message}`);
      }
    }
  }
}

export default CatalogService;
