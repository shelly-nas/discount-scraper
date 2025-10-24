export class ScraperRunModel {
  id: number;
  supermarket: string;
  status: "running" | "success" | "failed";
  productsScraped: number;
  productsUpdated: number;
  productsCreated: number;
  discountsDeactivated: number;
  discountsCreated: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;

  constructor(
    id: number,
    supermarket: string,
    status: "running" | "success" | "failed",
    productsScraped: number = 0,
    productsUpdated: number = 0,
    productsCreated: number = 0,
    discountsDeactivated: number = 0,
    discountsCreated: number = 0,
    errorMessage: string | undefined = undefined,
    startedAt: Date = new Date(),
    completedAt: Date | undefined = undefined,
    durationSeconds: number | undefined = undefined
  ) {
    this.id = id;
    this.supermarket = supermarket;
    this.status = status;
    this.productsScraped = productsScraped;
    this.productsUpdated = productsUpdated;
    this.productsCreated = productsCreated;
    this.discountsDeactivated = discountsDeactivated;
    this.discountsCreated = discountsCreated;
    this.errorMessage = errorMessage;
    this.startedAt = startedAt;
    this.completedAt = completedAt;
    this.durationSeconds = durationSeconds;
  }
}

export default ScraperRunModel;
