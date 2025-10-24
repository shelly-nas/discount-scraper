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
      const scheduledRunController =
        this.dataManager.getScheduledRunController();
      const dueRuns = await scheduledRunController.getDueScheduledRuns();

      if (dueRuns.length === 0) {
        serverLogger.debug("No due scraper runs at this time");
        this.isRunning = false;
        return;
      }

      serverLogger.info(
        `Found ${dueRuns.length} due scraper run(s): ${dueRuns
          .map((r) => r.supermarket)
          .join(", ")}`
      );

      // Trigger each due scraper
      for (const run of dueRuns) {
        await this.triggerScraper(run.supermarket);
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
