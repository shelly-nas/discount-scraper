import Logger from './Logger'

class ArgumentHandler {
    private args: string[];

    constructor(args: string[]) {
        this.args = args.slice(2); // Skip node path and script path
    }

    getArgByFlag(flag: string): string {
        const flagIndex = this.args.indexOf(flag);
        if (flagIndex !== -1 && flagIndex + 1 < this.args.length) {
            return this.args[flagIndex + 1];
        }
        Logger.error(`Error: The required flag "${flag}" is missing.`);
        process.exit(1);
    }
}

export default ArgumentHandler;