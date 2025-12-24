import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WelcomeDto {
  message: string;
  api: string;
  docs: string;
}

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getHello(): WelcomeDto {
    const appUrl =
      this.config.get<string>('app.appUrl') ??
      this.config.get<string>('APP_URL') ??
      null;

    const port =
      Number(
        this.config.get<number>('app.port') ??
          this.config.get<number>('port') ??
          process.env.PORT,
      ) || 3000;

    const apiPrefix =
      this.config.get<string>('app.apiPrefix') ??
      this.config.get<string>('apiPrefix') ??
      'api';

    const base = appUrl ?? `http://localhost:${port}`;

    return {
      message: 'Welcome to DKG API!',
      api: `${base}/${apiPrefix}`,
      docs: `${base}/docs`,
    };
  }
}
