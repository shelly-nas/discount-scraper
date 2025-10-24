export class ScheduledRunModel {
  id: number;
  supermarket: string;
  nextRunAt: Date;
  promotionExpireDate: Date;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(
    id: number,
    supermarket: string,
    nextRunAt: Date,
    promotionExpireDate: Date,
    enabled: boolean,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id;
    this.supermarket = supermarket;
    this.nextRunAt = nextRunAt;
    this.promotionExpireDate = promotionExpireDate;
    this.enabled = enabled;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
