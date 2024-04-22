import { Client } from "@notionhq/client";
import { logger } from "../../utils/Logger";
import NotionConverter from "../../utils/NotionConverter";

class NotionDatabaseClient {
  private notion: Client;
  private databaseId: string;

  constructor(integrationToken: string, databaseId: string) {
    this.notion = new Client({ auth: integrationToken });
    this.databaseId = databaseId;
  }

  // Retrieve all the current pages in the database
  public async getDatabaseContents() {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
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
        // databaseEntry
        properties: databaseEntry
        // properties: {
        // "ProductName": {
        //   "type": "title",
        //   "title": [
        //     {
        //       "type": "text",
        //       "text": {
        //         "content": "PLUS Nederlandse Aardbeien of blauwe bessen"
        //       }
        //     }
        //   ]
        // },
        // "OriginalPrice": {
        //   "type": "number",
        //   "number": 9.98
        // },
        // "DiscountPrice": {
        //   "type": "number",
        //   "number": 4.99
        // },
        // "SpecialDiscount": {
        //   "type": "rich_text",
        //   "rich_text": [
        //     {
        //       "type": "text",
        //       "text": {
        //         "content": "1+1 GRATIS"
        //       }
        //     }
        //   ]
        // },
        // "ProductCategory": {
        //   "type": "select",
        //   "select": {
        //     "name": "Aardappelen groente fruit"
        //   }
        // },
        // "Supermarket": {
        //   "type": "select",
        //   "select": {
        //     "name": "PLUS"
        //   }
        // }
        // {
        //   ProductName: {
        //     title: [
        //       {
        //         type: "text",
        //         text: {
        //           content: "Pindakaas",
        //         },
        //       },
        //     ],
        //   },
        //   OriginalPrice: {
        //     number: 2.29,
        //   },
          
          // DiscountPrice: {
          //   number: 1.49,
          // },
          // SpecialDiscount: {
          //   rich_text: [
          //     {
          //       text: {
          //         content: "25% Korting",
          //       },
          //     },
          //   ],
          // },
          // ProductCategory: {
          //   select: {
          //     name: "Aardappelen groente fruit",
          //   },
          // },
          // Supermarket: {
          //   select: {
          //     name: "PLUS",
          //   },
          // },
        // },
      });

      logger.info(`Created entry in database '${this.databaseId}'.`);
      logger.debug("Response:", response);
    } catch (error) {
      logger.error("Error creating entry in database:", error);
      process.exit(1);
    }
  }

  // Delete an entry in the database (delete a page)
  public async deleteDatabaseEntry(pageId: string) {
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
