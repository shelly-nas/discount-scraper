import { Client } from "@notionhq/client";
import { logger } from "../../utils/Logger";
import NotionConverter from "../../utils/NotionConverter";
import { PageObjectResponse, PartialPageObjectResponse, PartialDatabaseObjectResponse, DatabaseObjectResponse} from "@notionhq/client/build/src/api-endpoints";

class NotionDatabaseClient {
  private notion: Client;
  private databaseId: string;

  constructor(integrationToken: string, databaseId: string) {
    this.notion = new Client({ auth: integrationToken });
    this.databaseId = databaseId;
  }

  public async flushDatabase(productDiscounts: IGroceryDiscounts, filter: any = undefined): Promise<void> {
    logger.info('Starting to flush the database.');

    // Retrieve the current entries from the database
    const databaseEntries = await this.getDatabaseContents(filter);
    logger.debug(`Retrieved ${databaseEntries.length} entries from the database for archiving.`);

    // Archive each database entry
    for (const databaseEntry of databaseEntries) {
        await this.archiveDatabaseEntry(databaseEntry.id);
        logger.debug(`Archived database entry with ID: ${databaseEntry.id}`);
    }

    // Convert product discounts to database entries
    const productDiscountEntries = new NotionConverter().toDatabaseEntries(productDiscounts);
    logger.info(`Converted product discounts to ${productDiscountEntries.length} new database entries.`);

    // Set new database entries
    for (const productDiscountEntry of productDiscountEntries) {
        await this.setDatabaseEntry(productDiscountEntry);
    }

    logger.info('Completed flushing the database.');
}


  public async getDatabaseContents(filter: any = undefined): Promise<(PageObjectResponse | PartialPageObjectResponse | PartialDatabaseObjectResponse | DatabaseObjectResponse)[]> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: filter,
      });

      logger.info(
        `Retrieved contents of database with ID '${this.databaseId}'.`
      );
      return response.results;
    } catch (error) {
      logger.error("Error retrieving database contents:", error);
      throw error;
    }
  }

  // Create a new entry in the database (a new page with properties)
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

  // Delete an entry in the database (delete a page)
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
