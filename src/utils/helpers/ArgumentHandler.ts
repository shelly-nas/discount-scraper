import { logger } from "./Logger";

export default class ArgumentHandler {
  private args: string[];

  constructor(args: string[]) {
    this.args = args.slice(2); // Skip node path and script path
  }

  getArgByFlag(flag: string): string {
    try {
      const flagIndex = this.args.indexOf(flag);
      return this.args[flagIndex + 1];
    } catch (error) {
      logger.error(`Error: The required flag "${flag}" is missing.`);
      process.exit(1);
    }
  }
}
