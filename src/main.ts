import {
  ValidationPipe,
  ClassSerializerInterceptor,
  VersioningType,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { useContainer } from 'class-validator';
import bodyParser from 'body-parser';
import { AppModule } from './app.module';
import validationOptions from './interceptors/validation-options';
import { HttpExceptionFilter } from './filters/bad-request.filter';
import 'reflect-metadata';
import { ApiResponseInterceptor } from './interceptors/response.interceptor';
import { setupSwagger } from './shared/swagger/swagger.setup';
import { IoAdapter } from '@nestjs/platform-socket.io';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Attach Socket.IO adapter
    app.useWebSocketAdapter(new IoAdapter(app));
    app.use('/api/rdf', bodyParser.text({ type: 'text/turtle' }));

    app.enableCors({ origin: '*', credentials: false });

    useContainer(app.select(AppModule), { fallbackOnErrors: true });
    const configService = app.get(ConfigService);

    const port =
      Number(
        configService.get<number>('app.port') ??
          configService.get<number>('port') ??
          process.env.PORT,
      ) || 3000;

    app.enableShutdownHooks();
    app.setGlobalPrefix(configService.get('app.apiPrefix'), { exclude: ['/'] });

    app.enableVersioning({
      type: VersioningType.URI,
    });

    const reflector = app.get(Reflector);

    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(reflector),
      new ApiResponseInterceptor(),
    );
    app.useGlobalPipes(new ValidationPipe(validationOptions));
    // Global filter for error responses (consistent format)
    app.useGlobalFilters(new HttpExceptionFilter(reflector));

    const nodeEnv =
      configService.get<string>('nodeEnv') ??
      configService.get<string>('app.nodeEnv') ??
      process.env.NODE_ENV ??
      'development';

    if (nodeEnv !== 'production') {
      setupSwagger(app);
      logger.log('Swagger enabled at /docs');
    }

    await app.listen(port || 4000, '0.0.0.0');
    console.log(`Application is running on: ${await app.getUrl()}`);
  } catch (e) {
    logger.error('Failed to start application', (e as Error).stack ?? e);
    process.exit(1);
  }
}
void bootstrap();
