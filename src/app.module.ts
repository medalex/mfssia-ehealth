import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import { CorsMiddleware } from './middlewares/cors/cors.middleware';
import { OriginMiddleware } from './middlewares/origin/origin.middleware';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module';
import { AssetModule } from './modules/asset/asset.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: false,
      load: [appConfig],
      envFilePath: ['.env'],
    }),
    InfrastructureModule,          
    AssetModule    
  ],
  controllers: [AppController],
  providers: [AppService],
})

// export class AppModule {}
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware, OriginMiddleware).forRoutes('*');
  }
}
