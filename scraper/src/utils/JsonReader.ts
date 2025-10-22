import { logger } from "./Logger";
import fs from "fs";
import path from "path";

export default class JsonReader<T> {
  private jsonPath: string;

  constructor(filePath: string) {
    this.jsonPath = filePath;
  }

  public getFilePath(): string {
    return this.jsonPath;
  }

  public async read(): Promise<T> {
    const jsonObject: T = this.createJsonObject(this.jsonPath);
    logger.info(`Read '${this.jsonPath}' file successfully.`);
    return jsonObject;
  }

  private createJsonObject(filePath: string): T {
    try {
      // Ensure the file path is absolute
      const absolutePath: string = path.resolve(filePath);
      const fileContent: string = fs.readFileSync(absolutePath, "utf8");
      const jsonObject: T = JSON.parse(fileContent);
      logger.debug("JSON Object created:", jsonObject);
      return jsonObject;
    } catch (error) {
      logger.error(
        `Failed to read or parse the JSON file at ${this.jsonPath}:`,
        error
      );
      process.exit(1);
    }
  }
}
