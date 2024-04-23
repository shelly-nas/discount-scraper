import { logger } from "./Logger";
import Ajv from "ajv";
import fs from "fs";
import path from "path";

export default class JsonReader {
  private schemaPath: string;
  private jsonPath: string;

  constructor(schemaPath: string, filePath: string) {
    this.schemaPath = schemaPath;
    this.jsonPath = filePath;
  }

  public async read(): Promise<object> {
    const parsedGrocery = this.createJsonObject(this.jsonPath);

    const { isValid, errors } = await this.validateObject(parsedGrocery);

    if (!isValid) {
      logger.error("JSON key validation failed:", errors);
      process.exit(1);
    } else {
      logger.info(`Read '${this.jsonPath}' file successfully.`);
      return parsedGrocery;
    }
  }

  private createJsonObject(filePath: string): any {
    try {
      // Ensure the file path is absolute
      const absolutePath: string = path.resolve(filePath);
      const fileContent: string = fs.readFileSync(absolutePath, "utf8");
      return JSON.parse(fileContent);
    } catch (error) {
      logger.error(
        `Failed to read or parse the JSON file at ${this.jsonPath}:`,
        error
      );
      process.exit(1);
    }
  }

  private async validateObject(
    jsonData: object
  ): Promise<{ isValid: boolean; errors: any[] | null | undefined }> {
    const parsedSchema = this.createJsonObject(this.schemaPath);

    // Compile the schema
    const ajv = new Ajv({ allErrors: true });
    const schemaObject = ajv.compile(parsedSchema);

    // Validate the data
    const isValid = await schemaObject(jsonData);

    return {
      isValid,
      errors: schemaObject.errors, // This will be `null` if data is valid
    };
  }
}
