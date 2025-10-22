import NotionDatabaseClient from "../clients/database/NotionDatabaseClient";
import { INotionProductDiscountStructure } from "../interfaces/INotionProductDiscountStructure";
import { RichText } from "../models/NotionBasicModel";
import { Select, Title, Number, Text, Date } from "../models/NotionDatabaseModel";
import { logger } from "../utils/Logger";

class NotionDatabaseService {
  private client: NotionDatabaseClient;

  // Initialize the service with a Notion database client
  constructor(client: NotionDatabaseClient) {
    this.client = client;
  }

  public toDatabaseEntries(objects: IProductDiscountDetails[]): INotionProductDiscountStructure[] {
    try {
      const discountEntries = objects.map((obj) => this.mapToDatabaseStructure(obj));
      logger.info(
        `Converted supermarket discounts for '${objects[0].supermarket}' to Notion database.`
      );
      return discountEntries;
    } catch (error) {
      logger.error(`Error creating database object(s) for '${objects[0].supermarket}':`, error);
      process.exit(1);
    }
  }

  private mapToDatabaseStructure(object: IProductDiscountDetails): INotionProductDiscountStructure {
    logger.debug(`Create a product discount entry for '${object.name}'.`);
    return {
      ProductName: this.addTitle(object.name),
      OriginalPrice: this.addNumber(object.originalPrice),
      DiscountPrice: this.addNumber(object.discountPrice),
      SpecialDiscount: this.addText(object.specialDiscount),
      ProductCategory: this.addSelect(object.category),
      Supermarket: this.addSelect(object.supermarket),
      ExpireDate: this.addDate(object.expireDate)
    };
  }

  // Add a title field to a database entry
  private addTitle(richText: string): Title {
    return new Title([new RichText(richText)]);
  }

  // Add a number field to a database entry
  private addNumber(number: number): Number {
    return new Number(number);
  }

  // Add a text field to a database entry
  private addText(richText: string): Text {
    return new Text([new RichText(richText)]);
  }

  // Add a select field to a database entry
  private addSelect(select: string): Select {
    return new Select(select);
  }

  // Add a data field to database entry
  private addDate(date: string): Date {
    return new Date(date);
  }
}

export default NotionDatabaseService
