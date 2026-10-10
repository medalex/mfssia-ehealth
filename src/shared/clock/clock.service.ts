import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClockService {
  constructor(private readonly config: ConfigService) {}

  now(): Date {
    const reference = this.config.get<string>('app.evidenceReferenceTime');
    return reference ? new Date(reference) : new Date();
  }
}
