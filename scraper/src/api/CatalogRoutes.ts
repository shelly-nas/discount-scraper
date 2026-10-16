import { Request, Response, Router } from "express";
import CatalogService, { CatalogRunInProgressError } from "../services/CatalogService";
import { SUPERMARKETS } from "./PublicRoutes";
import PostgresDataContext from "../data/PostgresDataContext";
import { serverLogger } from "../utils/Logger";

/** Admin endpoints for the full catalog scrape, mounted under /api/catalog. */
export function createCatalogRoutes(service: CatalogService, db: PostgresDataContext): Router {
  const router = Router();

  // Per supermarket: whether a catalog scraper exists, product count and last run
  router.get("/status", async (req: Request, res: Response) => {
    try {
      const counts = await db.query<{ supermarket: string; count: string; updated: Date | null }>(
        `SELECT supermarket, COUNT(*) AS count, MAX(catalog_updated_at) AS updated
         FROM products WHERE in_catalog = true GROUP BY supermarket`
      );
      const lastRuns = await db.query(
        `SELECT DISTINCT ON (supermarket) * FROM catalog_runs
         ORDER BY supermarket, started_at DESC`
      );
      res.json(
        SUPERMARKETS.map((sm) => {
          const count = counts.rows.find((r) => r.supermarket === sm.name);
          const lastRun = lastRuns.rows.find((r: any) => r.supermarket === sm.name);
          return {
            key: sm.key,
            name: sm.name,
            supported: service.supportedSupermarkets.includes(sm.name),
            running: service.isRunning(sm.name),
            productsInCatalog: count ? parseInt(count.count, 10) : 0,
            lastUpdated: count?.updated ?? null,
            lastRun: lastRun ?? null,
          };
        })
      );
    } catch (error: any) {
      serverLogger.error(`Catalog status failed: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get("/runs", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 200);
      res.json(await service.getController().getRuns(limit));
    } catch (error: any) {
      serverLogger.error(`Catalog runs failed: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Starts a run in the background; poll /status or /runs for progress
  router.post("/run/:supermarket", async (req: Request, res: Response) => {
    const supermarket = SUPERMARKETS.find((s) => s.key === String(req.params.supermarket).toLowerCase());
    if (!supermarket) {
      res.status(400).json({ success: false, error: `Unknown supermarket: ${req.params.supermarket}` });
      return;
    }
    if (!service.supportedSupermarkets.includes(supermarket.name)) {
      res.status(400).json({
        success: false,
        error: `No catalog scraper for ${supermarket.name} yet`,
      });
      return;
    }
    try {
      const { runId } = await service.start(supermarket.name);
      res.status(202).json({ success: true, runId, supermarket: supermarket.name });
    } catch (error: any) {
      if (error instanceof CatalogRunInProgressError) {
        res.status(409).json({ success: false, error: error.message });
        return;
      }
      serverLogger.error(`Catalog run could not start: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
