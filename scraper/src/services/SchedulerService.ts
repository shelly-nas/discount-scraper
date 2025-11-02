import cron from "node-cron";
import { serverLogger } from "../utils/Logger";
import PostgresDataManager from "../data/PostgresDataManager";
import axios from "axios";

class SchedulerService {
  private cronJob: cron.ScheduledTask | null = null;
  private dataManager: PostgresDataManager;
  private apiPort: string;
  private isRunning = false;

  constructor(dataManager: PostgresDataManager, apiPort: string = "3001") {
    this.dataManager = dataManager;
    this.apiPort = apiPort;
  }

  /**
   * Start the scheduler to check for due runs every minute
   */
  public start(): void {
    if (this.cronJob) {
      serverLogger.warn("Scheduler is already running");
      return;
    }

    serverLogger.info("Starting scheduler service...");

    // Run every minute
    this.cronJob = cron.schedule("* * * * *", async () => {
      await this.checkAndRunDueScrapers();
    });

    serverLogger.info("Scheduler service started (checks every minute)");
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      serverLogger.info("Scheduler service stopped");
    }
  }

  /**
   * Check for due scrapers and trigger them
   */
  private async checkAndRunDueScrapers(): Promise<void> {
    if (this.isRunning) {
      serverLogger.debug("Scheduler check already in progress, skipping...");
      return;
    }

    this.isRunning = true;

    try {
      // First, deactivate any expired discounts
      const discountController = this.dataManager.getDiscountController();
      const deactivatedCount =
        await discountController.deactivateExpiredDiscounts();
      if (deactivatedCount > 0) {
        serverLogger.info(`Deactivated ${deactivatedCount} expired discounts`);
      }

      const scheduledRunController =
        this.dataManager.getScheduledRunController();
      const scraperRunController = this.dataManager.getScraperRunController();
      const dueRuns = await scheduledRunController.getDueScheduledRuns();

      if (dueRuns.length === 0) {
        serverLogger.debug("No due scraper runs at this time");
        this.isRunning = false;
        return;
      }

      // Filter out runs that have had a recent successful run (within last hour)
      const filteredRuns = [];
      for (const run of dueRuns) {
        const lastRun = await scraperRunController.getLastRunBySupermarket(
          run.supermarket
        );

        if (lastRun && lastRun.status === "success") {
          const lastRunTime = new Date(
            lastRun.completedAt || lastRun.startedAt
          );
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

          if (lastRunTime > oneHourAgo) {
            serverLogger.info(
              `Skipping ${run.supermarket} - recent successful run at ${lastRunTime}`
            );

            // Update next run time to prevent this from being considered "due" again
            const nextRunTime = new Date();
            nextRunTime.setDate(nextRunTime.getDate() + 1);
            nextRunTime.setHours(0, 1, 0, 0); // 00:01:00 next day

            await scheduledRunController.updateNextRunTime(
              run.supermarket,
              nextRunTime
            );
            continue;
          }
        }

        filteredRuns.push(run);
      }

      if (filteredRuns.length === 0) {
        serverLogger.debug(
          "No scraper runs need to be triggered (all have recent successful runs)"
        );
        this.isRunning = false;
        return;
      }

      serverLogger.info(
        `Found ${filteredRuns.length} scraper run(s) to trigger: ${filteredRuns
          .map((r) => r.supermarket)
          .join(", ")}`
      );

      // Trigger each filtered due scraper
      for (const run of filteredRuns) {
        // First, temporarily disable the scheduled run to prevent multiple triggers
        await scheduledRunController.toggleScheduledRun(run.supermarket, false);
        serverLogger.info(
          `Temporarily disabled scheduled run for ${run.supermarket}`
        );

        await this.triggerScraper(run.supermarket);

        // Update next run time to prevent immediate re-runs (schedule for next day)
        const nextRunTime = new Date();
        nextRunTime.setDate(nextRunTime.getDate() + 1);
        nextRunTime.setHours(0, 1, 0, 0); // 00:01:00 next day

        await scheduledRunController.updateNextRunTime(
          run.supermarket,
          nextRunTime
        );

        // Re-enable the scheduled run with updated time
        await scheduledRunController.toggleScheduledRun(run.supermarket, true);
        serverLogger.info(
          `Updated next run time for ${run.supermarket} to ${nextRunTime} and re-enabled`
        );
      }
    } catch (error) {
      serverLogger.error("Error checking for due scrapers:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Trigger a scraper run via internal API call
   */
  private async triggerScraper(supermarket: string): Promise<void> {
    try {
      // Map full names to URL params
      const nameMap: { [key: string]: string } = {
        "Albert Heijn": "albert-heijn",
        Dirk: "dirk",
        PLUS: "plus",
      };

      const supermarketParam = nameMap[supermarket];

      if (!supermarketParam) {
        serverLogger.error(
          `Unknown supermarket for scheduling: ${supermarket}`
        );
        return;
      }

      serverLogger.info(
        `Triggering scheduled scraper run for ${supermarket}...`
      );

      const url = `http://localhost:${this.apiPort}/api/scraper/run/${supermarketParam}`;

      // Make async API call - don't wait for completion
      axios
        .post(url)
        .then(() => {
          serverLogger.info(`Scheduled scraper run started for ${supermarket}`);
        })
        .catch((error: any) => {
          serverLogger.error(
            `Error triggering scheduled scraper for ${supermarket}:`,
            error.message
          );
        });
    } catch (error) {
      serverLogger.error(`Error triggering scraper for ${supermarket}:`, error);
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): { running: boolean; isProcessing: boolean } {
    return {
      running: this.cronJob !== null,
      isProcessing: this.isRunning,
    };
  }
}

export default SchedulerService;
