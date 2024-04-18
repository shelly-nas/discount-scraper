import DateTimeHandler from './DateTimeHandler';
import fs from 'fs';
import path from 'path';

enum LogLevel {
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4
}

class Logger {
    private static instance: Logger;
    private readonly logFilePath: string;
    private readonly logDirectory: string = './log';
    private currentLogLevel: LogLevel = LogLevel.INFO; // Default to INFO

    private constructor() {
        if (!fs.existsSync(this.logDirectory)) {
            fs.mkdirSync(this.logDirectory, { recursive: true });
        }

        const levelName = process.env.LOG_LEVEL as keyof typeof LogLevel || 'INFO';
        this.setLogLevel(LogLevel[levelName]);

        const logFileName = `discountScraper_${DateTimeHandler.getDateTimeShort()}.log`;
        this.logFilePath = path.join(this.logDirectory, logFileName);
    } 

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private setLogLevel(level: LogLevel) {
        this.currentLogLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        return level <= this.currentLogLevel;
    }
    
    private writeToFile(level: string, message: string, ...optionalParams: any[]): void {
        if (!this.shouldLog(LogLevel[level as keyof typeof LogLevel])) {
            return;
        }

        // Compose the initial part of the log message.
        const logMessage = `[${DateTimeHandler.getDateTimeLong()}] [${level}] ${message}`;

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