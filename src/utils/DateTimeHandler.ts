import moment from "moment";
import { logger } from "./Logger";
moment.locale("nl");

class DateTimeHandler {
  public static fromISOToDateTimeString(isoDateStr: string, pattern:string): string {
    // Create a moment object from the ISO string
    const date = moment(isoDateStr);
    if (!date.isValid()) {
      logger.error(`Invalid ISO date string: '${isoDateStr}'.`);
      throw new Error(`Invalid ISO date string: '${isoDateStr}'.`);
    }
    return date.format(pattern);
  }

  public static parseDateISOString(dateStr: string): string { // Method to parse strings like '12 mei', 'zaterdag 11 mei'
    const dateRegex = /(\d{1,2}\s+[a-zA-Z]+)/i;
    const match = dateStr.match(dateRegex);
    if (!match) {
      throw `No match found for '${dateStr}'.`
    }

    const date = moment(match[0], "D MMMM", true);
    return date.toISOString();
  }

  public static getDateTimeString(pattern: string, toUTC: boolean = true): string {
    const date = toUTC ? moment().utc() : moment();
    return date.format(pattern);
  }
}

export default DateTimeHandler;
