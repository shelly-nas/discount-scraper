export default class DateTimeHandler {
  private static getFormattedDateTime(): {
    year: string;
    month: string;
    day: string;
    hours: string;
    minutes: string;
    seconds: string;
    milliseconds: string;
  } {
    const now = new Date();

    return {
      year: now.getUTCFullYear().toString(),
      month: (now.getUTCMonth() + 1).toString().padStart(2, "0"),
      day: now.getUTCDate().toString().padStart(2, "0"),
      hours: now.getUTCHours().toString().padStart(2, "0"),
      minutes: now.getUTCMinutes().toString().padStart(2, "0"),
      seconds: now.getUTCSeconds().toString().padStart(2, "0"),
      milliseconds: now.getUTCMilliseconds().toString().padStart(3, "0"),
    };
  }

  public static getDateTimeLong(): string {
    const { year, month, day, hours, minutes, seconds, milliseconds } =
      this.getFormattedDateTime();
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  public static getDateTimeShort(): string {
    const { year, month, day, hours, minutes, seconds } =
      this.getFormattedDateTime();
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }
}
