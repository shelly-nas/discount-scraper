import { logger } from './Logger';
import fs from 'fs';
import path from 'path';

export default class JsonWriter {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
        this.ensureDirectoryExistence(filePath);
    }

    private ensureDirectoryExistence(filePath: string): void {
        const dirname: string = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return;
        }
        fs.mkdirSync(dirname, { recursive: true });
    }

    private writeJsonObject(filePath: string, data: object): void {
        try {
            const absolutePath: string = path.resolve(filePath);
            const fileContent: string = JSON.stringify(data, null, 4); // Indent with 4 spaces for readability
            fs.writeFileSync(absolutePath, fileContent, 'utf8');
        } catch (error) {
            logger.error(`Failed to write to JSON file at '${this.filePath}':`, error);
            process.exit(1);
        }
    }

    public async write(data: object): Promise<void> {
        this.writeJsonObject(this.filePath, data);
        logger.info(`Successfully wrote data to '${this.filePath}'.`);
    }

    public getFilePath(): string {
        return this.filePath;
    }
}