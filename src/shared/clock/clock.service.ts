import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClockService {
  private readonly referenceTime?: Date;

  constructor(private readonly config: ConfigService) {
    const reference = this.config.get<string>('app.evidenceReferenceTime');
    if (reference === undefined || reference === null || reference === '') {
      this.referenceTime = undefined;
      return;
    }

    const parsed = new Date(reference);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid EVIDENCE_REFERENCE_TIME: ${reference}`);
    }
    this.referenceTime = parsed;
  }

  now(): Date {
    return this.referenceTime ?? new Date();
  }
}
