import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getHello() {
    const port =
      this.config.get<number>('app.port') ??
      this.config.get<number>('port') ??
      3000;

    const apiPrefix =
      this.config.get<string>('app.apiPrefix') ??
      this.config.get<string>('apiPrefix') ??
      'api';

    const host = 'http://localhost';

    return {
      message: 'Welcome to DKG API!',
      api: '/api',
      docs: '/docs',
    };
  }
}
