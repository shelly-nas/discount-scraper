import fs from 'fs';
import { logger } from './Logger';

class ConfigReader {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }
        
    // Reads and parses the JSON file synchronously
    public readConfig(): any {
        try {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(fileContent);
        } catch (error) {
        logger.error(`Failed to read or parse the JSON file: ${error}`);
        process.exit(0);
        }
    }
}

export default ConfigReader;