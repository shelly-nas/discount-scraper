import { logger } from './Logger';
import fs from 'fs';
import path from 'path';

class JsonReader {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    read(): any {
        try {
            // Ensure the file path is absolute
            const absolutePath = path.resolve(this.filePath);
            const fileContent = fs.readFileSync(absolutePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            logger.error(`Failed to read or parse the JSON file at ${this.filePath}:`, error);
            throw error;
        }
    }
}

export default JsonReader;