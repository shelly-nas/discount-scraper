import { logger } from "./Logger";
import Ajv from "ajv";
import fs from "fs";
import path from "path";

export default class JsonReader<T> {
  private schemaPath: string;
  private jsonPath: string;

  constructor(filePath: string, schemaPath: string = "") {
    this.schemaPath = schemaPath;
    this.jsonPath = filePath;
  }

  public getFilePath(): string {
    return this.jsonPath;
  }
  
  public async read(): Promise<T> {
    const jsonObject: T = this.createJsonObject(this.jsonPath);

    if (this.schemaPath != "") {
      const { isValid, errors } = await this.validateObject(jsonObject);
      
      if (!isValid) {
        logger.error("JSON key validation failed:", errors);
        process.exit(1);
      }
    }

    logger.info(`Read '${this.jsonPath}' file successfully.`);
    return jsonObject;
  }

  private createJsonObject(filePath: string): T {
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
    jsonData: T
  ): Promise<{ isValid: boolean; errors: any[] | null | undefined }> {
    const parsedSchema = this.createJsonObject(this.schemaPath) as object;

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
