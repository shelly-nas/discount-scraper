import { logger } from './Logger';
import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';

class JsonReader {
    private schemaPath: string = 'config/schema.json';
    private groceryPath: string;

    constructor(filePath: string) {
        this.groceryPath = filePath;
    }

    private createJsonObject(filePath: string): any {
        try {
            // Ensure the file path is absolute
            const absolutePath: string = path.resolve(filePath);
            const fileContent: string = fs.readFileSync(absolutePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            logger.error(`Failed to read or parse the JSON file at ${this.groceryPath}:`, error);
            process.exit(0);
        }
    }   

    private async validateObject(jsonData: object): Promise<{ isValid: boolean; errors: any[] | null | undefined }> {
        const parsedSchema: Grocery = this.createJsonObject(this.schemaPath);
        
        // Compile the schema
        const ajv = new Ajv({allErrors: true});
        const schemaObject = ajv.compile(parsedSchema);
        
        // Validate the data
        const isValid = await schemaObject(jsonData);
        
        return {
            isValid,
            errors: schemaObject.errors // This will be `null` if data is valid
        };
    }

    public async read(): Promise<Grocery> {         
        const parsedGrocery: Grocery = this.createJsonObject(this.groceryPath);
        
        const {isValid, errors} = await this.validateObject(parsedGrocery)
        
        if (!isValid) {
            const errorMissingProperty = errors?.map(error => error.params.missingProperty).join(', ');
            logger.error(`JSON key validation failed. Properties missing: '${errorMissingProperty}'`)
            process.exit(0);
        }
        else {
            return parsedGrocery
        }
    }
}

export default JsonReader;