import {
  ValidationPipe,
  ClassSerializerInterceptor,
  VersioningType,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import validationOptions from './interceptors/validation-options';
import { HttpExceptionFilter } from './filters/bad-request.filter';
import { QueryFailedFilter } from './filters/query-failed.filter';
import 'reflect-metadata';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    app.enableCors({
      origin: true,
      credentials: true,
    });

    useContainer(app.select(AppModule), { fallbackOnErrors: true });
    const configService = app.get(ConfigService);

    const port =
      Number(
        configService.get<number>('app.port') ??
          configService.get<number>('port') ??
          process.env.PORT,
      ) || 3000;

    app.enableShutdownHooks();
    app.setGlobalPrefix(configService.get('app.apiPrefix'), {exclude: ['/']});

    app.enableVersioning({
      type: VersioningType.URI,
    });
    
    const reflector = app.get(Reflector);

    app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
    app.useGlobalPipes(new ValidationPipe(validationOptions));
    app.useGlobalFilters(
      new HttpExceptionFilter(reflector),
      new QueryFailedFilter(reflector),
    );

    const nodeEnv =
        configService.get<string>('nodeEnv') ??
        configService.get<string>('app.nodeEnv') ??
        process.env.NODE_ENV ??
        'development';

    if (nodeEnv !== 'production') {
      const options = new DocumentBuilder()
        .setTitle('MFSSIA DKG API')
        .setDescription('MFSSIA DKG API docs')
        .setVersion('1.0')        
        .build();

      const document = SwaggerModule.createDocument(app, options);
      SwaggerModule.setup('docs', app, document);  
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
