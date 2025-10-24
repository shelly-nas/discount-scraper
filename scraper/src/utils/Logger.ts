import DateTimeHandler from "./DateTimeHandler";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

// Load .env from project root (three levels up from this file)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

enum LogLevel {
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

// Server Logger - logs to console only
class ServerLogger {
  private static instance: ServerLogger;
  private currentLogLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    const levelName =
      (process.env.LOG_LEVEL as keyof typeof LogLevel) || "INFO";
    this.setLogLevel(LogLevel[levelName]);
  }

  public static getInstance(): ServerLogger {
    if (!ServerLogger.instance) {
      ServerLogger.instance = new ServerLogger();
    }
    return ServerLogger.instance;
  }

  private setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLogLevel;
  }

  private formatMessage(
    level: string,
    message: string,
    ...optionalParams: any[]
  ): string {
    const timestamp = DateTimeHandler.getDateTimeString(
      "YYYY-MM-DD HH:mm:ss.SSS"
    );
    let fullMessage = `[${timestamp}] [${level}] ${message}`;

    if (optionalParams.length > 0) {
      optionalParams.forEach((param) => {
        if (typeof param === "object") {
          fullMessage += " " + JSON.stringify(param, null, 2);
        } else {
          fullMessage += " " + String(param);
        }
      });
    }

    return fullMessage;
  }

  public debug(message: string, ...optionalParams: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage("DEBUG", message, ...optionalParams));
    }
  }

  public info(message: string, ...optionalParams: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage("INFO", message, ...optionalParams));
    }
  }

  public warn(message: string, ...optionalParams: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("WARN", message, ...optionalParams));
    }
  }

  public error(message: string, ...optionalParams: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage("ERROR", message, ...optionalParams));
    }
  }
}

// Scraper Logger - logs to file with supermarket name
class ScraperLogger {
  private static instance: ScraperLogger;
  private readonly logDirectory: string = "./logs";
  private currentLogLevel: LogLevel = LogLevel.INFO;
  private logFilePath: string | null = null;
  private supermarketName: string | null = null;

  constructor() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    const levelName =
      (process.env.LOG_LEVEL as keyof typeof LogLevel) || "INFO";
    this.setLogLevel(LogLevel[levelName]);
  }

  public static getInstance(): ScraperLogger {
    if (!ScraperLogger.instance) {
      ScraperLogger.instance = new ScraperLogger();
    }
    return ScraperLogger.instance;
  }

  private setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLogLevel;
  }

  public setSupermarket(supermarketName: string) {
    this.supermarketName = supermarketName;
    const sanitizedName = supermarketName.replace(/\s+/g, "-").toLowerCase();
    const logFileName = `${sanitizedName}_${DateTimeHandler.getDateTimeString(
      "YYYYMMDD-HHmmss"
    )}.log`;
    this.logFilePath = path.join(this.logDirectory, logFileName);
  }

  private writeToFile(
    level: string,
    message: string,
    ...optionalParams: any[]
  ): void {
    if (!this.logFilePath) {
      // Silently skip logging if supermarket is not set yet
      // This is expected during initialization before setSupermarket() is called
      return;
    }

    if (!this.shouldLog(LogLevel[level as keyof typeof LogLevel])) {
      return;
    }

    const logMessage = `[${DateTimeHandler.getDateTimeString(
      "YYYY-MM-DD HH:mm:ss.SSS"
    )}] [${level}] ${message}`;

    try {
      fs.appendFileSync(this.logFilePath!, logMessage);

      optionalParams.forEach((param) => {
        let paramAsString;
        if (typeof param === "object") {
          paramAsString = JSON.stringify(param, null, 2);
        } else {
          paramAsString = String(param);
        }
        fs.appendFileSync(this.logFilePath!, " " + paramAsString);
      });

      fs.appendFileSync(this.logFilePath!, "\n");
    } catch (error) {
      console.error("Error writing to log file:", error);
    }
  }

  public debug(message: string, ...optionalParams: any[]) {
    this.writeToFile("DEBUG", message, ...optionalParams);
  }

  public info(message: string, ...optionalParams: any[]) {
    this.writeToFile("INFO", message, ...optionalParams);
  }

  public warn(message: string, ...optionalParams: any[]) {
    this.writeToFile("WARN", message, ...optionalParams);
  }

  public error(message: string, ...optionalParams: any[]) {
    this.writeToFile("ERROR", message, ...optionalParams);
  }
}

// Export server logger as default logger for server operations
export const serverLogger = ServerLogger.getInstance();

// Export scraper logger factory function
export const scraperLogger = ScraperLogger.getInstance();
