import * as fs from "fs/promises";
import * as path from "path";
import lockfile from "proper-lockfile";
import { logger } from "../utils/Logger";

class JsonDataContext<T> {
  private filename: string;

  constructor(filename: string) {
    this.filename = filename;
  }

  public async load(): Promise<T[]> {
    try {
      await this.exists();
      const release = await lockfile.lock(this.filename);
      try {
        const data = await fs.readFile(this.filename, "utf-8");
        return JSON.parse(data);
      } finally {
        await release();
      }
    } catch (error) {
      logger.error(`Failed to read from ${this.filename}:`, error);
      process.exit(1);
    }
  }

  public async save(data: T[]): Promise<void> {
    try {
      await this.exists();
      const release = await lockfile.lock(this.filename);
      try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(this.filename, jsonData, "utf-8");
      } finally {
        await release();
      }
    } catch (error) {
      logger.error(`Failed to write to ${this.filename}:`, error);
      process.exit(1);
    }
  }

  public async exists(): Promise<boolean> {
    try {
      await fs.access(this.filename);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // If the file does not exist, ensure the directory exists first
        await this.ensureDirectoryExists();
        // Then, create the file with an empty array JSON content
        await fs.writeFile(this.filename, JSON.stringify([]), "utf-8");
        return false;
      } else {
        logger.error(`Failed to access ${this.filename}:`, error);
        process.exit(1);
      }
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    const dir = path.dirname(this.filename);
    await fs.mkdir(dir, { recursive: true });
  }

  public async deleteFile(): Promise<void> {
    try {
      const release = await lockfile.lock(this.filename);
      try {
        if (await this.exists()) {
          await fs.unlink(this.filename);
          logger.info(`Successfully deleted ${this.filename}`);
        } else {
          logger.warn("No file found to delete.");
        }
      } finally {
        await release();
      }
    } catch (error) {
      logger.error(`Failed to delete ${this.filename}:`, error);
    }
  }
}

export default JsonDataContext;
