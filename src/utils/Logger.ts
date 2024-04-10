import fs from 'fs';
import path from 'path';

class Logger {
    private static instance: Logger;
    private readonly logFilePath: string;
    private readonly logDirectory: string = './log';
    
    private constructor() {
        if (!fs.existsSync(this.logDirectory)) {
            fs.mkdirSync(this.logDirectory, { recursive: true });
        }
        
        const logFileName = `${this.getDateTime(false)}-discountScraper.log`;
        this.logFilePath = path.join(this.logDirectory, logFileName);
    } 

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private getDateTime(fullDateTime: boolean = true): string {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = now.getUTCDate().toString().padStart(2, '0');
        const hours = now.getUTCHours().toString().padStart(2, '0');
        const minutes = now.getUTCMinutes().toString().padStart(2, '0');
        const seconds = now.getUTCSeconds().toString().padStart(2, '0');
        const milliseconds = now.getUTCMilliseconds().toString().padStart(3, '0');
    
        // Format each part of the date/time to ensure it is two digits, except milliseconds which should be three digits
        return fullDateTime 
            ? `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}` 
            : `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }
    

    private writeToFile(level: string, message: string, ...optionalParams: any[]): void {
        // Compose the initial part of the log message.
    const logMessage = `[${this.getDateTime()}] [${level}] ${message}`;

    try {
        // Append the initial message to the file.
        fs.appendFileSync(this.logFilePath, logMessage);

        // Append each optional parameter as a new entry in the log file.
        optionalParams.forEach((param) => {
            let paramAsString;
            if (typeof param === 'object') {
                paramAsString = JSON.stringify(param, null, 2); // Prettify objects.
            } else {
                paramAsString = String(param); // Convert others to string.
            }
            fs.appendFileSync(this.logFilePath, ' ' + paramAsString);
        });

        // Add a newline at the end of the log entry.
        fs.appendFileSync(this.logFilePath, '\n');
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }
    
    public debug(message: string, ...optionalParams: any[]) {
        this.writeToFile('DEBUG', message, ...optionalParams);
    }

    public info(message: string, ...optionalParams: any[]) {
        this.writeToFile('INFO', message, ...optionalParams);
    }

    public warn(message: string, ...optionalParams: any[]) {
        this.writeToFile('WARN', message, ...optionalParams);
    }

    public error(message: string, ...optionalParams: any[]) {
        this.writeToFile('ERROR', message, ...optionalParams);
    }
}

export const logger = Logger.getInstance();