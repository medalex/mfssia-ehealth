import { ServiceUnavailableException } from '@nestjs/common';

export class DkgUnavailableException extends ServiceUnavailableException {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}