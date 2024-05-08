import { Client } from "@notionhq/client";
import { logger } from "../../utils/Logger";
import { PageObjectResponse, PartialPageObjectResponse, PartialDatabaseObjectResponse, DatabaseObjectResponse} from "@notionhq/client/build/src/api-endpoints";
import { INotionProductDiscountStructure } from "../../interfaces/INotionProductDiscountStructure";

class NotionDatabaseClient {
  private notion: Client;
  private databaseId: string;

  constructor(integrationToken: string, databaseId: string) {
    this.notion = new Client({ auth: integrationToken, timeoutMs: 10000 });
    this.databaseId = databaseId;
  }

  public async flushDatabase(discountEntries: INotionProductDiscountStructure[], filter: any = undefined): Promise<void> {
    logger.info('Starting to flush the database.');

    // Retrieve the current entries from the database
    const databaseEntries = await this.getDatabaseContents(filter);
    logger.debug(`Retrieved ${databaseEntries.length} entries from the database for archiving.`);

    // Archive each database entry
    for (const databaseEntry of databaseEntries) {
        await this.archiveDatabaseEntry(databaseEntry.id);
        logger.debug(`Archived database entry with ID: ${databaseEntry.id}`);
    }

    // Set new database entries
    for (const discountEntry of discountEntries) {
        await this.setDatabaseEntry(discountEntry);
    }

    logger.info('Completed flushing the database.');
  }

  public async getDatabaseContents(filter: any = undefined): Promise<(PageObjectResponse | PartialPageObjectResponse | PartialDatabaseObjectResponse | DatabaseObjectResponse)[]> {
    try {
      let allEntries = [];
      let hasMore = true;
      let startCursor: string | undefined | null = undefined;

      while (hasMore) {
        const response = await this.notion.databases.query({
          database_id: this.databaseId,
          filter: filter,
          start_cursor: startCursor!
        });

        allEntries.push(...response.results); // Add new entries to the array

        hasMore = response.has_more; // Update 'hasMore' depending on the response
        startCursor = response.next_cursor; // Set the 'startCursor' for the next iteration

        logger.debug(
          `Found ${allEntries.length} Notion blocks, adding to batch.`
        );
      }

      logger.info(`Retrieved ${allEntries.length} Notion blocks for page '${this.databaseId}'.`);
      return allEntries;
    } catch (error) {
      logger.error("Error listing Notion page blocks:", error);
      process.exit(1);
    }
  }

  public async setDatabaseEntry(databaseEntry: any) {
    try {
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databaseId
        },
        properties: databaseEntry
      });

      logger.info(`Created entry in database '${this.databaseId}'.`);
      logger.debug("Response:", response);
    } catch (error) {
      logger.error("Error creating entry in database:", error);
      process.exit(1);
    }
  }

  public async archiveDatabaseEntry(pageId: string) {
    try {
      const response = await this.notion.pages.update({
        page_id: pageId,
        archived: true,
      });
      
      logger.info(`Deleted entry with ID '${pageId}' from database.`);
      return response;
    } catch (error) {
      logger.error("Error deleting entry from database:", error);
      throw error;
    }
  }
}

export default NotionDatabaseClient;
